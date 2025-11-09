// llms-txt.ts - llms.txt 文件解析和处理
import type { PageLink } from './scraper';

/**
 * llms.txt 文件中的单个链接
 */
export interface LlmsTxtLink {
  title: string;    // 链接标题
  url: string;      // URL
  notes?: string;   // 可选的说明文字
}

/**
 * llms.txt 文件中的一个部分
 */
export interface LlmsTxtSection {
  title: string;           // 部分标题 (例如: "Docs", "Examples", "Optional")
  isOptional: boolean;     // 是否是 Optional 部分
  links: LlmsTxtLink[];
}

/**
 * llms.txt 文件的完整内容
 */
export interface LlmsTxtContent {
  title: string;                // 项目名称 (H1)
  description?: string;         // 简介 (blockquote)
  details?: string;             // 详细说明 (H1/blockquote 之后，第一个 H2 之前的内容)
  sections: LlmsTxtSection[];   // 所有部分
}

/**
 * 尝试获取网站的 llms.txt 文件
 * @param baseUrl 网站的基础 URL
 * @returns llms.txt 的内容,如果不存在或获取失败则返回 null
 */
export async function fetchLlmsTxt(baseUrl: string): Promise<LlmsTxtContent | null> {
  try {
    // 构建 llms.txt URL
    const urlObj = new URL(baseUrl);
    const llmsTxtUrl = `${urlObj.origin}/llms.txt`;

    const response = await fetch(llmsTxtUrl);

    if (!response.ok) {
      return null;
    }

    const content = await response.text();

    // 验证内容不为空
    if (!content || content.trim().length < 10) {
      return null;
    }

    // 解析内容
    return parseLlmsTxt(content);
  } catch (error) {
    // 静默失败
    return null;
  }
}

/**
 * 解析 llms.txt Markdown 内容
 * @param content llms.txt 文件的 Markdown 内容
 * @returns 解析后的结构化数据
 */
export function parseLlmsTxt(content: string): LlmsTxtContent {
  const lines = content.split('\n');

  let title = '';
  let description: string | undefined;
  let details: string | undefined;
  const sections: LlmsTxtSection[] = [];

  let currentSection: LlmsTxtSection | null = null;
  let detailsLines: string[] = [];
  let inDetails = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();

    // 跳过空行
    if (trimmed === '') {
      if (inDetails) {
        detailsLines.push('');
      }
      continue;
    }

    // H1 标题
    if (trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim();
      inDetails = false;
      continue;
    }

    // Blockquote 描述
    if (trimmed.startsWith('>')) {
      description = trimmed.slice(1).trim();
      inDetails = true; // 开始收集 details
      continue;
    }

    // H2 部分标题
    if (trimmed.startsWith('## ')) {
      // 保存之前收集的 details
      if (inDetails && detailsLines.length > 0) {
        details = detailsLines.join('\n').trim();
        inDetails = false;
      }

      // 保存上一个 section
      if (currentSection) {
        sections.push(currentSection);
      }

      // 创建新 section
      const sectionTitle = trimmed.slice(3).trim();
      currentSection = {
        title: sectionTitle,
        isOptional: sectionTitle.toLowerCase() === 'optional',
        links: []
      };
      continue;
    }

    // 列表项 (链接)
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      if (currentSection) {
        const link = parseLink(trimmed.slice(1).trim());
        if (link) {
          currentSection.links.push(link);
        }
      }
      continue;
    }

    // 其他内容作为 details
    if (inDetails) {
      detailsLines.push(line);
    }
  }

  // 保存最后一个 section
  if (currentSection) {
    sections.push(currentSection);
  }

  // 保存最后的 details
  if (inDetails && detailsLines.length > 0) {
    details = detailsLines.join('\n').trim();
  }

  return {
    title,
    description,
    details,
    sections
  };
}

/**
 * 解析单个链接行
 * @param text 链接文本 (去掉了列表标记的 -)
 * @returns 解析后的链接,如果解析失败则返回 null
 */
function parseLink(text: string): LlmsTxtLink | null {
  // 匹配 Markdown 链接格式: [title](url) 或 [title](url): notes
  const linkMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?/);

  if (!linkMatch) {
    return null;
  }

  const [, title, url, notes] = linkMatch;

  return {
    title: title?.trim() || '',
    url: url?.trim() || '',
    notes: notes?.trim()
  };
}

/**
 * 将 llms.txt 内容转换为 PageLink 数组
 * @param llmsTxt llms.txt 解析结果
 * @param baseUrl 网站的基础 URL (用于过滤外部链接)
 * @param includeOptional 是否包含 Optional 部分
 * @returns PageLink 数组
 */
export function llmsTxtToPageLinks(
  llmsTxt: LlmsTxtContent,
  baseUrl: string,
  includeOptional: boolean = false
): PageLink[] {
  const links: PageLink[] = [];
  const baseHostname = new URL(baseUrl).hostname;

  for (const section of llmsTxt.sections) {
    // 跳过 Optional 部分（如果未启用）
    if (section.isOptional && !includeOptional) {
      continue;
    }

    for (const link of section.links) {
      try {
        // 解析链接 URL
        const linkUrl = new URL(link.url, baseUrl);

        // 只保留同域名的链接
        if (linkUrl.hostname !== baseHostname) {
          continue;
        }

        // 检查是否是 .txt 文件 (如 llms-full.txt)
        const isFullContent = linkUrl.pathname.endsWith('.txt');

        links.push({
          url: linkUrl.href,
          title: link.title,
          isFullContent
        });
      } catch (error) {
        // 跳过无效的 URL
        continue;
      }
    }
  }

  return links;
}

/**
 * 生成 llms.txt 统计信息（用于显示）
 * @param llmsTxt llms.txt 解析结果
 * @param baseUrl 网站的基础 URL
 * @param includeOptional 是否包含 Optional 部分
 * @returns 统计信息
 */
export function getLlmsTxtStats(
  llmsTxt: LlmsTxtContent,
  baseUrl: string,
  includeOptional: boolean
): {
  totalSections: number;
  totalLinks: number;
  skippedOptionalLinks: number;
  skippedExternalLinks: number;
  sections: Array<{ title: string; linkCount: number; isOptional: boolean }>;
} {
  const baseHostname = new URL(baseUrl).hostname;
  let totalLinks = 0;
  let skippedOptionalLinks = 0;
  let skippedExternalLinks = 0;

  const sections = llmsTxt.sections.map(section => {
    let linkCount = 0;

    for (const link of section.links) {
      try {
        const linkUrl = new URL(link.url, baseUrl);

        // 检查是否是外部链接
        if (linkUrl.hostname !== baseHostname) {
          skippedExternalLinks++;
          continue;
        }

        // 检查是否应该跳过 Optional
        if (section.isOptional && !includeOptional) {
          skippedOptionalLinks++;
          continue;
        }

        linkCount++;
        totalLinks++;
      } catch (error) {
        // 无效 URL
        continue;
      }
    }

    return {
      title: section.title,
      linkCount,
      isOptional: section.isOptional
    };
  });

  return {
    totalSections: sections.filter(s => !s.isOptional || includeOptional).length,
    totalLinks,
    skippedOptionalLinks,
    skippedExternalLinks,
    sections: sections.filter(s => s.linkCount > 0 || (!s.isOptional || includeOptional))
  };
}
