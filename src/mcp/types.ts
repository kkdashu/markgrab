// types.ts - MCP parameter and response types

/**
 * Scraping mode
 */
export type ScrapeMode = "auto" | "follow" | "single";

/**
 * Parameters for scrape_documentation tool
 */
export interface ScrapeDocumentationParams {
  url: string;
  mode?: ScrapeMode;
  followLinksSelector?: string;
  contentAreaSelector?: string;
  outputDir?: string;
  useNativeMd?: boolean;
  useLlmsTxt?: boolean;
  includeOptional?: boolean;
  maxConcurrent?: number;
  maxRetries?: number;
  dryRun?: boolean;
}

/**
 * Response from scrape_documentation tool
 */
export interface ScrapeDocumentationResponse {
  success: boolean;
  filesCreated: number;
  outputDirectory: string;
  stats: {
    total: number;
    successful: number;
    failed: number;
    duration: string;
  };
  files?: string[];
  errors?: Array<{ url: string; error: string }>;
}

/**
 * Parameters for preview_scrape tool
 */
export interface PreviewScrapeParams {
  url: string;
  mode?: ScrapeMode;
  followLinksSelector?: string;
  contentAreaSelector?: string;
  useLlmsTxt?: boolean;
  includeOptional?: boolean;
}

/**
 * Response from preview_scrape tool
 */
export interface PreviewScrapeResponse {
  totalPages: number;
  pages: Array<{
    title: string;
    url: string;
  }>;
  config: {
    contentSelector: string;
    outputDir: string;
    nativeMd: boolean;
    mode: ScrapeMode;
  };
}

/**
 * Parameters for extract_links tool
 */
export interface ExtractLinksParams {
  url: string;
  selector: string;
}

/**
 * Response from extract_links tool
 */
export interface ExtractLinksResponse {
  links: Array<{
    title: string;
    url: string;
  }>;
  count: number;
}

/**
 * Parameters for check_llms_txt tool
 */
export interface CheckLlmsTxtParams {
  url: string;
  includeOptional?: boolean;
}

/**
 * Response from check_llms_txt tool
 */
export interface CheckLlmsTxtResponse {
  found: boolean;
  llmsTxtUrl?: string;
  title?: string;
  description?: string;
  sections?: Array<{
    title: string;
    linkCount: number;
    isOptional: boolean;
  }>;
  totalLinks?: number;
  skippedOptionalLinks?: number;
  skippedExternalLinks?: number;
}

/**
 * Parameters for analyze_html_structure tool
 */
export interface AnalyzeHtmlParams {
  url: string;
}

/**
 * Response from analyze_html_structure tool
 */
export interface AnalyzeHtmlResponse {
  url: string;
  tempFilePath: string;
  fileSize: number;
  preview: string;
}
