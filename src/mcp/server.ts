#!/usr/bin/env bun
// server.ts - MCP server entry point
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerScrapeDocumentationTool,
  registerPreviewScrapeTool,
  registerExtractLinksTool,
  registerCheckLlmsTxtTool,
  registerAnalyzeHtmlStructureTool,
} from './tools/index.ts';

/**
 * Create and configure the MCP server
 */
function createServer() {
  const server = new McpServer(
    {
      name: 'markgrab',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  registerScrapeDocumentationTool(server);
  registerPreviewScrapeTool(server);
  registerExtractLinksTool(server);
  registerCheckLlmsTxtTool(server);
  registerAnalyzeHtmlStructureTool(server);

  return server;
}

/**
 * Main function to start the MCP server
 */
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('Markgrab MCP server started');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
