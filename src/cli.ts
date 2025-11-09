// cli.ts - 命令行接口
import { parseArgs as utilParseArgs } from 'node:util';
import type { ScraperOptions } from './scraper';
import { loadConfig, getDomainConfig, type DomainConfig } from './config';

/**
 * CLI 参数接口
 */
export interface CliArgs {
  url: string;
  followLinksSelector?: string;
  contentAreaSelector: string;
  outputDir: string;
  useNativeMd: boolean;
  showHelp: boolean;
  configPath?: string;
  useLlmsTxt: boolean;
  includeOptional: boolean;
  dryRun: boolean;
}

/**
 * 显示帮助信息
 */
export function showHelp(): void {
  console.log(`
markgrab - 网页文档抓取工具

用法: bun src/index.ts --url=<url> [选项]

必需参数:
  --url=<url>                    要抓取的页面 URL

选项:
  --follow=<selector>            跟随链接的 CSS 选择器 (抓取匹配的所有链接)
  --content=<selector>           内容区域的 CSS 选择器 (默认: 'body')
  --output=<dir>                 输出目录 (默认: 当前目录 './')
  --config=<path>                配置文件路径 (TOML 格式)
  --no-native-md                 禁用原生 Markdown,强制 HTML 转换
  --no-llms-txt                  禁用 llms.txt 自动检测
  --include-optional             包含 llms.txt 中的 Optional 部分
  --dry-run                      预览模式,只显示将要抓取的内容,不实际抓取
  --help, -h                     显示此帮助信息

抓取规则 (按优先级):
  1. 如果有 llms.txt → 按 llms.txt 规则抓取
  2. 如果设置 --follow → 抓取本页面 + 所有匹配链接
  3. 否则 → 只抓取当前页面

示例:
  # 只抓取单个页面
  bun src/index.ts --url=https://bun.com/docs/installation

  # 自动检测 llms.txt (推荐)
  bun src/index.ts --url=https://hono.dev/docs

  # 跟随链接抓取整个站点
  bun src/index.ts --url=https://bun.com/docs --follow='a[href^="/docs/"]'

  # 自定义所有参数
  bun src/index.ts \\
    --url=https://bun.com/docs \\
    --follow='a[href^="/docs/"]' \\
    --content=main \\
    --output=./my_docs

  # 禁用 llms.txt，强制使用 CSS 选择器
  bun src/index.ts --url=https://hono.dev --no-llms-txt --follow='nav a'

  # 使用配置文件
  bun src/index.ts --url=https://bun.com/docs --config=config.toml

配置文件:
  • 使用 TOML 格式,以域名为 key 设置不同网站的默认配置
  • CLI 参数会覆盖配置文件中的设置
  • 配置示例:
    ["bun.com"]
    followLinksSelector = "a[href^='/docs/']"
    contentAreaSelector = "main"
    outputDir = "./docs"
    useNativeMd = true

提示:
  • 文件会自动保存到 <output>/<域名>/ 目录下
  • 默认会先尝试获取原生 Markdown (.md URL)
  • 使用 --no-native-md 可跳过原生 Markdown 尝试
  `);
}

/**
 * 解析命令行参数
 * @param argv 命令行参数数组 (通常是 Bun.argv.slice(2))
 * @returns 解析后的参数
 */
export async function parseArgs(argv: string[]): Promise<CliArgs> {
  // 使用 util.parseArgs 解析参数
  const { values } = utilParseArgs({
    args: argv,
    options: {
      url: {
        type: 'string',
      },
      follow: {
        type: 'string',
      },
      content: {
        type: 'string',
      },
      output: {
        type: 'string',
      },
      config: {
        type: 'string',
      },
      'no-native-md': {
        type: 'boolean',
        default: false,
      },
      'no-llms-txt': {
        type: 'boolean',
        default: false,
      },
      'include-optional': {
        type: 'boolean',
        default: false,
      },
      'dry-run': {
        type: 'boolean',
        default: false,
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
    allowPositionals: false,
  });

  // 检查是否显示帮助
  if (values.help || argv.length === 0) {
    return {
      url: '',
      followLinksSelector: undefined,
      contentAreaSelector: 'body',
      outputDir: './',
      useNativeMd: true,
      showHelp: true,
      useLlmsTxt: true,
      includeOptional: false,
      dryRun: false
    };
  }

  // 提取 CLI 参数值
  const url = values.url as string | undefined;
  const configPath = values.config as string | undefined;

  // 验证必需参数
  if (!url) {
    throw new Error('缺少必需参数: --url=<url>');
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`无效的 URL: ${url}`);
  }

  // 1. 加载配置文件 (如果指定)
  let domainConfig: DomainConfig | undefined;
  if (configPath) {
    try {
      const config = await loadConfig(configPath);
      domainConfig = getDomainConfig(config, url);
      if (domainConfig) {
        console.log(`📝 从配置文件加载域名配置`);
      } else {
        console.warn(`⚠️  配置文件中未找到 ${new URL(url).hostname} 的配置`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`配置文件错误: ${error.message}`);
      }
      throw error;
    }
  }

  // 2. 合并配置：CLI 参数 > 配置文件 > 默认值
  // 优先级: CLI 显式指定 > 配置文件 > 默认值
  const followLinksSelector =
    (values.follow as string | undefined) ??
    domainConfig?.followLinksSelector;

  const contentAreaSelector =
    (values.content as string | undefined) ??
    domainConfig?.contentAreaSelector ??
    'body';

  const outputDir =
    (values.output as string | undefined) ??
    domainConfig?.outputDir ??
    './';

  // 对于 boolean 值，需要特殊处理
  // 如果 CLI 明确指定了 --no-native-md，则使用 false
  // 否则使用配置文件的值，如果配置文件也没有则默认 true
  const cliNoNativeMd = values['no-native-md'] as boolean;
  const useNativeMd = cliNoNativeMd ? false : (domainConfig?.useNativeMd ?? true);

  // llms.txt 相关参数
  const cliNoLlmsTxt = values['no-llms-txt'] as boolean;
  const useLlmsTxt = cliNoLlmsTxt ? false : (domainConfig?.useLlmsTxt ?? true);

  const cliIncludeOptional = values['include-optional'] as boolean;
  const includeOptional = cliIncludeOptional ? true : (domainConfig?.includeOptional ?? false);

  const dryRun = values['dry-run'] as boolean;

  return {
    url,
    followLinksSelector,
    contentAreaSelector,
    outputDir,
    useNativeMd,
    showHelp: false,
    configPath,
    useLlmsTxt,
    includeOptional,
    dryRun
  };
}

/**
 * 将 CLI 参数转换为 Scraper 选项
 * @param cliArgs CLI 参数
 * @returns Scraper 选项
 */
export function cliArgsToScraperOptions(cliArgs: CliArgs): ScraperOptions {
  return {
    baseUrl: cliArgs.url,
    followLinksSelector: cliArgs.followLinksSelector || '',
    contentAreaSelector: cliArgs.contentAreaSelector,
    outputDir: cliArgs.outputDir,
    useNativeMd: cliArgs.useNativeMd,
    useLlmsTxt: cliArgs.useLlmsTxt,
    includeOptional: cliArgs.includeOptional,
    dryRun: cliArgs.dryRun
  };
}
