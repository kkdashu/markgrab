// extract-links.ts - Extract Links Tool
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractLinks as scraperExtractLinks } from '../../scraper.ts';
import type {
  ExtractLinksParams,
  ExtractLinksResponse,
} from '../types.ts';

/**
 * Handler for extract_links tool
 */
async function handleExtractLinks(
  params: ExtractLinksParams
): Promise<ExtractLinksResponse> {
  // Validate URL
  try {
    new URL(params.url);
  } catch (error) {
    throw new Error(`Invalid URL: ${params.url}`);
  }

  if (!params.selector || params.selector.trim() === '') {
    throw new Error('CSS selector is required');
  }

  const links = await scraperExtractLinks(params.url, params.selector);

  return {
    links: links.map(link => ({ title: link.title, url: link.url })),
    count: links.length,
  };
}

/**
 * Register the extract_links tool with the MCP server
 */
export function registerExtractLinksTool(server: McpServer) {
  server.registerTool(
    'extract_links',
    {
      title: 'Extract Links',
      description: `Extract all links from a webpage that match a CSS selector.

Useful for:
- Finding all documentation links on a page
- Discovering navigation structure
- Testing CSS selectors before scraping
- Building custom scraping workflows

Returns an array of links with their titles and URLs.`,
      inputSchema: {
        url: z.string().describe('The URL of the page to extract links from'),
        selector: z.string().describe('CSS selector to match links. Examples: "nav a", "a[href^=\\"/docs/\\"]", ".sidebar a"'),
      },
    },
    async (args) => {
      try {
        const result = await handleExtractLinks(args as ExtractLinksParams);
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
