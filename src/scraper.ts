// scraper.ts - 核心抓取业务逻辑
import { load } from 'cheerio';
import TurndownService from 'turndown';
import { mkdirSync } from 'fs';
import pLimit from 'p-limit';
import { fetchLlmsTxt, llmsTxtToPageLinks, getLlmsTxtStats } from './llms-txt';
import { ProgressTracker } from './progress';
import { withRetry, RETRYABLE_HTTP_ERRORS } from './retry';

// --- 类型定义 ---

export interface ScraperOptions {
  baseUrl: string;
  followLinksSelector: string;
  contentAreaSelector: string;
  outputDir: string;
  useNativeMd?: boolean;
  useLlmsTxt?: boolean;
  includeOptional?: boolean;
  dryRun?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  maxConcurrent?: number;
}

export interface PageLink {
  url: string;
  title: string;
  isFullContent?: boolean;  // 标记这是一个完整内容文件 (如 llms-full.txt)
}

// --- 初始化服务 ---
const turndownService = new TurndownService();

// --- 工具函数 ---

/**
 * 从 URL 中提取域名
 * @param url URL 字符串
 * @returns 域名 (例如 "bun.com")
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // 移除 www. 前缀
  } catch (error) {
    return 'unknown';
  }
}

/**
 * 清理字符串,使其成为有效的文件名
 * @param text 输入字符串 (例如 "API > Bun.Glob")
 * @returns 清理后的文件名 (例如 "api_bun_glob")
 */
export function sanitizeFilename(text: string): string {
  return text
    .replace(/>/g, '') // 移除 >
    .replace(/[^a-z0-9\s.-]/gi, '') // 移除特殊字符
    .replace(/[\s.-]+/g, '_') // 替换空格和点为下划线
    .toLowerCase();
}

/**
 * 尝试获取原生 Markdown 格式的内容
 * @param url 原始 URL
 * @returns Markdown 内容,如果获取失败则返回 null
 */
export async function tryFetchNativeMarkdown(url: string): Promise<string | null> {
  // 生成可能的 Markdown URL 列表
  const possibleMdUrls = generateMarkdownUrls(url);

  // 依次尝试每个 URL
  for (const mdUrl of possibleMdUrls) {
    try {
      const response = await fetch(mdUrl, {
        headers: {
          'Accept': 'text/markdown, text/plain, */*'
        }
      });

      // 检查响应是否成功
      if (!response.ok) {
        continue; // 尝试下一个 URL
      }

      const text = await response.text();

      // 验证内容不是 HTML 错误页面
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        continue;
      }

      // 验证内容看起来像 Markdown (基本检查)
      if (text.length < 10) {
        continue;
      }

      // 找到有效的 Markdown 内容
      return text;
    } catch (error) {
      continue; // 尝试下一个 URL
    }
  }

  // 所有尝试都失败
  return null;
}

/**
 * 根据 URL 生成可能的 Markdown URL 列表
 * @param url 原始 URL
 * @returns 可能的 Markdown URL 数组
 */
function generateMarkdownUrls(url: string): string[] {
  const urls: string[] = [];

  // 解析 URL
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const hasTrailingSlash = url.endsWith('/');

  // 移除末尾的斜杠用于某些尝试
  const pathnameWithoutSlash = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // 情况 1: 如果 URL 以文件扩展名结尾 (如 .html, .htm, .php 等)
  const extMatch = pathnameWithoutSlash.match(/^(.+)\.([a-z0-9]+)$/i);
  if (extMatch) {
    const [, pathWithoutExt, ext] = extMatch;

    // 1.1 替换扩展名为 .md (例如: /page.html -> /page.md)
    urls.push(`${urlObj.origin}${pathWithoutExt}.md`);

    // 1.2 直接添加 .md (例如: /page.html -> /page.html.md)
    urls.push(`${urlObj.origin}${pathnameWithoutSlash}.md`);
  } else {
    // 情况 2: URL 没有扩展名

    // 2.1 如果原 URL 以斜杠结尾，优先尝试 index.md 模式
    // 例如: /docs/guide/ -> /docs/guide/index.md
    if (hasTrailingSlash) {
      urls.push(`${urlObj.origin}${pathname}index.md`);
    }

    // 2.2 直接添加 .md (例如: /docs/installation -> /docs/installation.md)
    urls.push(`${urlObj.origin}${pathnameWithoutSlash}.md`);

    // 2.3 如果原 URL 不以斜杠结尾，也尝试 /path/index.md 模式
    // 例如: /docs/guide -> /docs/guide/index.md
    if (!hasTrailingSlash) {
      urls.push(`${urlObj.origin}${pathnameWithoutSlash}/index.md`);
    }
  }

  return urls;
}

/**
 * 抓取单个页面并将其转换为 Markdown
 * @param url 要抓取的页面 URL
 * @param title 页面的标题 (用于文件名)
 * @param contentAreaSelector 内容区域的 CSS 选择器
 * @param outputDir 输出目录路径
 * @param useNativeMd 是否尝试使用原生 Markdown
 * @param isFullContent 是否是完整内容文件 (如 llms-full.txt)
 * @param progress 可选的进度追踪器
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export async function scrapePage(
  url: string,
  title: string,
  contentAreaSelector: string,
  outputDir: string,
  useNativeMd: boolean = true,
  isFullContent: boolean = false,
  progress?: ProgressTracker,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<void> {
  try {
    // 通知进度追踪器开始
    progress?.start();

    // 如果有进度追踪器，不输出单个页面的日志，只在没有进度追踪器时输出
    if (!progress) {
      console.log(`⏳ 正在抓取: ${title} (${url})`);
    }

    let markdown: string | null = null;

    // 0. 如果是完整内容文件,直接获取并保存
    if (isFullContent) {
      const response = await withRetry(
        () => fetch(url),
        maxRetries,
        retryDelay,
        RETRYABLE_HTTP_ERRORS
      );

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        if (!progress) {
          console.error(`❌ 获取 ${url} 失败: ${errorMsg}`);
        }
        progress?.fail(url, errorMsg);
        return;
      }
      markdown = await response.text();

      // 移除可能的系统提示行 (如 <SYSTEM>...</SYSTEM>)
      markdown = markdown.replace(/<SYSTEM>.*?<\/SYSTEM>\s*/gs, '').trim();

      if (!progress) {
        console.log(`   📄 使用完整内容文件`);
      }
    }
    // 1. 如果允许,先尝试获取原生 Markdown
    else if (useNativeMd) {
      markdown = await tryFetchNativeMarkdown(url);
      if (markdown && !progress) {
        console.log(`   📝 使用原生 Markdown`);
      }
    }

    // 2. 如果原生 Markdown 获取失败,则转换 HTML
    if (!markdown) {
      if (useNativeMd && !progress) {
        console.log(`   🔄 原生 Markdown 不可用,转换 HTML`);
      }

      const response = await withRetry(
        () => fetch(url),
        maxRetries,
        retryDelay,
        RETRYABLE_HTTP_ERRORS
      );

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        if (!progress) {
          console.error(`❌ 获取 ${url} 失败: ${errorMsg}`);
        }
        progress?.fail(url, errorMsg);
        return;
      }
      const html = await response.text();

      // 加载 HTML 并提取主要内容
      const $ = load(html);
      const contentHtml = $(contentAreaSelector).html();

      if (!contentHtml) {
        const errorMsg = `未找到内容区域: ${contentAreaSelector}`;
        if (!progress) {
          console.warn(`⚠️ 在 ${url} ${errorMsg}`);
        }
        progress?.fail(url, errorMsg);
        return;
      }

      // 转换为 Markdown
      markdown = turndownService.turndown(contentHtml);
    }

    // 3. 生成并保存文件
    const filename = sanitizeFilename(title);
    const filePath = `${outputDir}/${filename}.md`;

    await Bun.write(filePath, markdown);
    if (!progress) {
      console.log(`✅ 已保存: ${filePath}`);
    }

    // 标记成功
    progress?.success();

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!progress) {
      console.error(`❌ 处理 ${url} 时出错:`, errorMsg);
    }
    progress?.fail(url, errorMsg);
  }
}

/**
 * 从入口页面提取所有文档链接
 * @param baseUrl 入口 URL
 * @param followLinksSelector 跟随链接选择器
 * @returns 链接列表
 */
export async function extractLinks(
  baseUrl: string,
  followLinksSelector: string
): Promise<PageLink[]> {
  const response = await fetch(baseUrl);
  const html = await response.text();
  const $ = load(html);

  const linksToScrape: PageLink[] = [];
  const seenUrls = new Set<string>();

  $(followLinksSelector).each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();

    if (href && title) {
      // 过滤掉资源文件
      if (href.includes('_next') || href.includes('sitemap') ||
          href.includes('favicon') || title.length === 0) {
        return;
      }

      // 将相对 URL (例如 /docs/install) 转换为绝对 URL
      const fullUrl = new URL(href, baseUrl).href;

      // 去重
      if (!seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        linksToScrape.push({ url: fullUrl, title: title });
      }
    }
  });

  return linksToScrape;
}

/**
 * 主抓取函数
 * @param options 抓取选项
 */
export async function scrape(options: ScraperOptions): Promise<void> {
  const {
    baseUrl,
    followLinksSelector,
    contentAreaSelector,
    outputDir: baseOutputDir,
    useNativeMd = true,
    useLlmsTxt = true,
    includeOptional = false,
    dryRun = false,
    maxRetries = 3,
    retryDelay = 1000,
    maxConcurrent = 10
  } = options;

  // Dry-run 模式提示
  if (dryRun) {
    console.log(`🔍 预览模式 (--dry-run)\n`);
  } else {
    console.log(`🚀 开始抓取: ${baseUrl}`);
  }

  console.log(`📄 内容区域选择器: ${contentAreaSelector}`);
  console.log(`${useNativeMd ? '✨' : '🔄'} Markdown 模式: ${useNativeMd ? '优先使用原生 Markdown' : '仅 HTML 转换'}`);

  // 根据域名创建输出目录
  const domain = extractDomain(baseUrl);
  const outputDir = `${baseOutputDir}/${domain}`;

  // 确保输出目录存在
  mkdirSync(outputDir, { recursive: true });
  console.log(`📁 输出目录: ${outputDir}`);

  try {
    // 1. 尝试使用 llms.txt (如果启用)
    if (useLlmsTxt) {
      const llmsTxt = await fetchLlmsTxt(baseUrl);

      if (llmsTxt) {
        // 获取统计信息
        const stats = getLlmsTxtStats(llmsTxt, baseUrl, includeOptional);

        // 显示 llms.txt 信息
        console.log(`📋 检测到 llms.txt`);
        console.log(`   标题: ${llmsTxt.title}`);

        // 显示部分信息
        const sectionInfo = stats.sections
          .filter(s => s.linkCount > 0)
          .map(s => `${s.title} (${s.linkCount} 个链接)`)
          .join(', ');
        console.log(`   部分: ${sectionInfo}`);

        // 显示跳过的信息
        if (stats.skippedOptionalLinks > 0) {
          console.log(`   已跳过: Optional (${stats.skippedOptionalLinks} 个链接)`);
        }
        if (stats.skippedExternalLinks > 0) {
          console.log(`   已跳过: ${stats.skippedExternalLinks} 个外部链接`);
        }

        // 提取链接
        const links = llmsTxtToPageLinks(llmsTxt, baseUrl, includeOptional);

        if (links.length > 0) {
          // Dry-run 模式：只显示链接列表
          if (dryRun) {
            console.log(`\n将要抓取的页面 (共 ${links.length} 个):`);
            const previewCount = Math.min(10, links.length);
            for (let i = 0; i < previewCount; i++) {
              const link = links[i];
              if (link) {
                console.log(`  ${i + 1}. ${link.title} - ${link.url}`);
              }
            }
            if (links.length > 10) {
              console.log(`  ... 还有 ${links.length - 10} 个页面\n`);
            }
            console.log(`\n📊 配置:`);
            console.log(`  内容选择器: ${contentAreaSelector}`);
            console.log(`  输出目录: ${outputDir}`);
            console.log(`  原生 Markdown: ${useNativeMd ? '启用' : '禁用'}`);
            console.log(`\n💡 提示: 移除 --dry-run 参数开始实际抓取`);
            return;
          }

          console.log(`🚀 开始抓取 ${links.length} 个文档...\n`);

          // 创建进度追踪器
          const progress = new ProgressTracker(links.length);

          // 创建并发限制器
          const limit = pLimit(maxConcurrent);

          // 并发抓取所有页面（带并发控制）
          await Promise.all(
            links.map(link => limit(() => scrapePage(link.url, link.title, contentAreaSelector, outputDir, useNativeMd, link.isFullContent, progress, maxRetries, retryDelay)))
          );

          // 显示统计摘要
          progress.showSummary();
          console.log(`\n📁 文件保存在: ${outputDir}`);
          return;
        }
      }
    }

    // 2. 如果设置了 --follow，则抓取本页面 + 所有匹配链接
    if (followLinksSelector && followLinksSelector.trim() !== '') {
      console.log(`📋 跟随链接选择器: ${followLinksSelector}`);

      // 提取所有链接
      const links = await extractLinks(baseUrl, followLinksSelector);

      if (links.length === 0) {
        console.error(`❌ 未找到任何链接,请检查选择器: ${followLinksSelector}`);
        console.warn(`⚠️  提示: 可能选择器不正确,或页面结构已改变`);
        return;
      }

      console.log(`🔍 找到 ${links.length} 个文档页面...`);

      // Dry-run 模式：只显示链接列表
      if (dryRun) {
        console.log(`\n将要抓取的页面 (共 ${links.length} 个):`);
        const previewCount = Math.min(10, links.length);
        for (let i = 0; i < previewCount; i++) {
          const link = links[i];
          if (link) {
            console.log(`  ${i + 1}. ${link.title} - ${link.url}`);
          }
        }
        if (links.length > 10) {
          console.log(`  ... 还有 ${links.length - 10} 个页面\n`);
        }
        console.log(`\n📊 配置:`);
        console.log(`  内容选择器: ${contentAreaSelector}`);
        console.log(`  输出目录: ${outputDir}`);
        console.log(`  原生 Markdown: ${useNativeMd ? '启用' : '禁用'}`);
        console.log(`\n💡 提示: 移除 --dry-run 参数开始实际抓取`);
        return;
      }

      console.log(`🚀 开始抓取...\n`);

      // 创建进度追踪器
      const progress = new ProgressTracker(links.length);

      // 创建并发限制器
      const limit = pLimit(maxConcurrent);

      // 并发抓取所有页面（带并发控制）
      await Promise.all(
        links.map(link => limit(() => scrapePage(link.url, link.title, contentAreaSelector, outputDir, useNativeMd, false, progress, maxRetries, retryDelay)))
      );

      // 显示统计摘要
      progress.showSummary();
      console.log(`\n📁 文件保存在: ${outputDir}`);
      return;
    }

    // 3. 否则只抓取当前页面
    console.log(`📄 只抓取当前页面`);

    // 从 URL 提取页面标题
    const urlPath = new URL(baseUrl).pathname;
    const title = urlPath.split('/').filter(Boolean).pop() || 'index';

    // Dry-run 模式：只显示单页信息
    if (dryRun) {
      console.log(`\n将要抓取的页面:`);
      console.log(`  1. ${title} - ${baseUrl}`);
      console.log(`\n📊 配置:`);
      console.log(`  内容选择器: ${contentAreaSelector}`);
      console.log(`  输出目录: ${outputDir}`);
      console.log(`  原生 Markdown: ${useNativeMd ? '启用' : '禁用'}`);
      console.log(`\n💡 提示: 移除 --dry-run 参数开始实际抓取`);
      return;
    }

    await scrapePage(baseUrl, title, contentAreaSelector, outputDir, useNativeMd, false, undefined, maxRetries, retryDelay);
    console.log(`🎉 抓取完成! 文件保存在: ${outputDir}`);

  } catch (error) {
    console.error('❌ 发生严重错误:', error);
    throw error;
  }
}
