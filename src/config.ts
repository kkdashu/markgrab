// config.ts - 配置文件读取和解析
import { parse as parseToml } from 'toml';
import { existsSync } from 'fs';

/**
 * 域名配置接口
 */
export interface DomainConfig {
  followLinksSelector?: string;
  contentAreaSelector?: string;
  outputDir?: string;
  useNativeMd?: boolean;
  useLlmsTxt?: boolean;
  includeOptional?: boolean;
}

/**
 * TOML 配置文件结构
 * 以域名为 key，每个域名有自己的配置
 */
export interface TomlConfig {
  [domain: string]: DomainConfig;
}

/**
 * 从 TOML 文件读取配置
 * @param configPath 配置文件路径
 * @returns 解析后的配置对象
 */
export async function loadConfig(configPath: string): Promise<TomlConfig> {
  try {
    // 检查文件是否存在
    if (!existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }

    // 读取文件内容
    const content = await Bun.file(configPath).text();

    // 解析 TOML
    const config = parseToml(content) as TomlConfig;

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`读取配置文件失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 从 URL 中提取域名
 * @param url URL 字符串
 * @returns 域名 (例如 "bun.com")
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // 移除 www. 前缀
  } catch (error) {
    return '';
  }
}

/**
 * 根据 URL 获取对应的域名配置
 * @param config TOML 配置对象
 * @param url 目标 URL
 * @returns 该域名的配置，如果不存在则返回 undefined
 */
export function getDomainConfig(config: TomlConfig, url: string): DomainConfig | undefined {
  const domain = extractDomainFromUrl(url);
  return config[domain];
}
