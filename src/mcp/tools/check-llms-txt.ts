// check-llms-txt.ts - Check llms.txt Tool
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchLlmsTxt, getLlmsTxtStats } from '../../llms-txt.ts';
import type {
  CheckLlmsTxtParams,
  CheckLlmsTxtResponse,
} from '../types.ts';

/**
 * Handler for check_llms_txt tool
 */
async function handleCheckLlmsTxt(
  params: CheckLlmsTxtParams
): Promise<CheckLlmsTxtResponse> {
  // Validate URL
  try {
    new URL(params.url);
  } catch (error) {
    throw new Error(`Invalid URL: ${params.url}`);
  }

  const includeOptional = params.includeOptional ?? false;
  const llmsTxt = await fetchLlmsTxt(params.url);

  if (!llmsTxt) {
    return {
      found: false,
    };
  }

  const urlObj = new URL(params.url);
  const llmsTxtUrl = `${urlObj.origin}/llms.txt`;

  const stats = getLlmsTxtStats(llmsTxt, params.url, includeOptional);

  return {
    found: true,
    llmsTxtUrl,
    title: llmsTxt.title,
    description: llmsTxt.description,
    sections: stats.sections,
    totalLinks: stats.totalLinks,
    skippedOptionalLinks: stats.skippedOptionalLinks,
    skippedExternalLinks: stats.skippedExternalLinks,
  };
}

/**
 * Register the check_llms_txt tool with the MCP server
 */
export function registerCheckLlmsTxtTool(server: McpServer) {
  server.registerTool(
    'check_llms_txt',
    {
      title: 'Check llms.txt',
      description: `Check if a website has an llms.txt file and preview its structure.

llms.txt is a standard format for documenting what documentation exists on a site,
optimized for LLM consumption. See https://llmstxt.org for more information.

This tool:
- Checks if /llms.txt exists at the site's origin
- Parses the structure and sections
- Shows link counts per section
- Indicates optional sections
- Reports external links that would be skipped

Useful for understanding a site's documentation structure before scraping.`,
      inputSchema: {
        url: z.string().describe('The URL of the website to check (can be any page, will check origin/llms.txt)'),
        includeOptional: z.boolean().optional().default(false).describe('Include optional sections in the analysis (default: false)'),
      },
    },
    async (args) => {
      try {
        const result = await handleCheckLlmsTxt(args as CheckLlmsTxtParams);
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
