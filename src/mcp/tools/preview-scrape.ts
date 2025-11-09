// preview-scrape.ts - Preview Scrape Tool
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractLinks as scraperExtractLinks, extractDomain } from '../../scraper.ts';
import { fetchLlmsTxt, llmsTxtToPageLinks } from '../../llms-txt.ts';
import type {
  PreviewScrapeParams,
  PreviewScrapeResponse,
} from '../types.ts';

/**
 * Handler for preview_scrape tool
 */
async function handlePreviewScrape(
  params: PreviewScrapeParams
): Promise<PreviewScrapeResponse> {
  // Validate URL
  try {
    new URL(params.url);
  } catch (error) {
    throw new Error(`Invalid URL: ${params.url}`);
  }

  const contentAreaSelector = params.contentAreaSelector || 'body';
  const useLlmsTxt = params.useLlmsTxt ?? true;
  const includeOptional = params.includeOptional ?? false;

  let pages: Array<{ title: string; url: string }> = [];
  let mode: 'auto' | 'follow' | 'single' = params.mode || 'auto';

  // Try llms.txt first (if enabled)
  if (useLlmsTxt && mode === 'auto') {
    const llmsTxt = await fetchLlmsTxt(params.url);
    if (llmsTxt) {
      const links = llmsTxtToPageLinks(llmsTxt, params.url, includeOptional);
      pages = links.map(link => ({ title: link.title, url: link.url }));
      mode = 'auto';
    }
  }

  // If no llms.txt and followLinksSelector provided, extract links
  if (pages.length === 0 && params.followLinksSelector) {
    const links = await scraperExtractLinks(params.url, params.followLinksSelector);
    pages = links.map(link => ({ title: link.title, url: link.url }));
    mode = 'follow';
  }

  // If still no pages, single page mode
  if (pages.length === 0) {
    const urlPath = new URL(params.url).pathname;
    const title = urlPath.split('/').filter(Boolean).pop() || 'index';
    pages = [{ title, url: params.url }];
    mode = 'single';
  }

  return {
    totalPages: pages.length,
    pages,
    config: {
      contentSelector: contentAreaSelector,
      outputDir: './' + extractDomain(params.url),
      nativeMd: true,
      mode,
    },
  };
}

/**
 * Register the preview_scrape tool with the MCP server
 */
export function registerPreviewScrapeTool(server: McpServer) {
  server.registerTool(
    'preview_scrape',
    {
      title: 'Preview Scrape',
      description: `Preview what pages would be scraped without actually downloading content.

This is a dry-run mode that helps you:
- Verify the correct pages will be scraped
- Check if llms.txt is detected
- Validate CSS selectors before actual scraping
- Estimate the scope of a scraping operation

Returns a list of all pages that would be scraped along with configuration details.`,
      inputSchema: {
        url: z.string().describe('The URL to preview scraping for'),
        mode: z.enum(['auto', 'follow', 'single']).optional().default('auto').describe('Scraping mode (default: "auto")'),
        followLinksSelector: z.string().optional().describe('CSS selector to find links (for "follow" mode)'),
        contentAreaSelector: z.string().optional().default('body').describe('CSS selector for content area (default: "body")'),
        useLlmsTxt: z.boolean().optional().default(true).describe('Check for llms.txt (default: true)'),
        includeOptional: z.boolean().optional().default(false).describe('Include optional sections from llms.txt (default: false)'),
      },
    },
    async (args) => {
      try {
        const result = await handlePreviewScrape(args as PreviewScrapeParams);
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
