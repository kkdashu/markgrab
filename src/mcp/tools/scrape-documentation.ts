// scrape-documentation.ts - Scrape Documentation Tool
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scrape, extractDomain } from '../../scraper.ts';
import { readdirSync } from 'fs';
import { join } from 'path';
import type {
  ScrapeDocumentationParams,
  ScrapeDocumentationResponse,
} from '../types.ts';

/**
 * Handler for scrape_documentation tool
 */
async function handleScrapeDocumentation(
  params: ScrapeDocumentationParams
): Promise<ScrapeDocumentationResponse> {
  const startTime = Date.now();

  // Validate URL
  try {
    new URL(params.url);
  } catch (error) {
    throw new Error(`Invalid URL: ${params.url}`);
  }

  // Determine mode
  let followLinksSelector = params.followLinksSelector || '';
  let useLlmsTxt = params.useLlmsTxt ?? true;

  if (params.mode === 'single') {
    followLinksSelector = '';
    useLlmsTxt = false;
  } else if (params.mode === 'follow') {
    useLlmsTxt = false;
    if (!params.followLinksSelector) {
      throw new Error('followLinksSelector is required when mode is "follow"');
    }
  }
  // mode === 'auto' uses default behavior

  // Prepare scraper options
  const scraperOptions = {
    baseUrl: params.url,
    followLinksSelector,
    contentAreaSelector: params.contentAreaSelector || 'body',
    outputDir: params.outputDir || './',
    useNativeMd: params.useNativeMd ?? true,
    useLlmsTxt,
    includeOptional: params.includeOptional ?? false,
    dryRun: params.dryRun ?? false,
    maxRetries: params.maxRetries ?? 3,
    maxConcurrent: params.maxConcurrent ?? 10,
  };

  // Create a custom progress tracker to capture stats
  let stats = {
    total: 0,
    successful: 0,
    failed: 0,
    duration: '0s',
  };
  let errors: Array<{ url: string; error: string }> = [];

  try {
    // Run the scraper
    await scrape(scraperOptions);

    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    stats.duration = `${duration}s`;

    // Get the output directory
    const domain = extractDomain(params.url);
    const fullOutputDir = `${scraperOptions.outputDir}/${domain}`;

    // List files created
    let files: string[] = [];
    let filesCreated = 0;
    try {
      const dirContents = readdirSync(fullOutputDir);
      files = dirContents
        .filter(f => f.endsWith('.md'))
        .map(f => join(fullOutputDir, f));
      filesCreated = files.length;
      stats.total = filesCreated;
      stats.successful = filesCreated;
    } catch (error) {
      // Directory might not exist if scraping failed
    }

    return {
      success: true,
      filesCreated,
      outputDirectory: fullOutputDir,
      stats,
      files,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      success: false,
      filesCreated: 0,
      outputDirectory: scraperOptions.outputDir,
      stats: {
        ...stats,
        duration: `${duration}s`,
      },
      errors: [{
        url: params.url,
        error: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}

/**
 * Register the scrape_documentation tool with the MCP server
 */
export function registerScrapeDocumentationTool(server: McpServer) {
  server.registerTool(
    'scrape_documentation',
    {
      title: 'Scrape Documentation',
      description: `Scrape website documentation and convert to Markdown format.

This tool intelligently scrapes web documentation using multiple strategies:
- Auto-detects and uses llms.txt if available (recommended)
- Follows links using CSS selectors for multi-page sites
- Single page scraping for individual documents

Features:
- Prioritizes native Markdown (.md) files when available
- Converts HTML to Markdown using Turndown
- Concurrent scraping with progress tracking
- Automatic retry on network failures
- Respects rate limits

Use this when you need to:
- Download entire documentation sites
- Convert web docs to Markdown for AI processing
- Archive documentation locally
- Extract structured content from websites`,
      inputSchema: {
        url: z.string().describe('The URL to scrape. Can be a documentation homepage or specific page.'),
        mode: z.enum(['auto', 'follow', 'single']).optional().default('auto').describe(`Scraping mode:
- "auto" (default): Auto-detect llms.txt, fallback to single page
- "follow": Follow links using CSS selector
- "single": Scrape only the specified URL`),
        followLinksSelector: z.string().optional().describe('CSS selector to find links to follow (required if mode is "follow"). Examples: "nav a", "a[href^=\\"/docs/\\"]", ".sidebar a"'),
        contentAreaSelector: z.string().optional().default('body').describe('CSS selector for the main content area (default: "body"). Examples: "main", "article", "#content", ".documentation"'),
        outputDir: z.string().optional().default('./').describe('Output directory for scraped files (default: "./"). Files will be saved to <outputDir>/<domain>/'),
        useNativeMd: z.boolean().optional().default(true).describe('Try to fetch native Markdown (.md) files before converting HTML (default: true)'),
        useLlmsTxt: z.boolean().optional().default(true).describe('Auto-detect and use llms.txt for structured scraping (default: true)'),
        includeOptional: z.boolean().optional().default(false).describe('Include "Optional" sections from llms.txt (default: false)'),
        maxConcurrent: z.number().optional().default(10).describe('Maximum concurrent requests (default: 10)'),
        maxRetries: z.number().optional().default(3).describe('Maximum retry attempts for failed requests (default: 3)'),
        dryRun: z.boolean().optional().default(false).describe('Preview mode: show what would be scraped without actually scraping (default: false)'),
      },
    },
    async (args) => {
      try {
        const result = await handleScrapeDocumentation(args as ScrapeDocumentationParams);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
