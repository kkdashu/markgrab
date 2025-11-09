# MCP Tools

This directory contains self-contained tool implementations for the markgrab MCP server.

## Structure

Each tool is implemented in its own file and includes:
- **Handler function**: The core logic for processing tool requests
- **Registration function**: Registers the tool with the MCP server, including schema and description
- **Type definitions**: Imported from `../types.ts`

### Available Tools

- `scrape-documentation.ts` - Scrapes documentation websites to Markdown
- `preview-scrape.ts` - Previews what would be scraped without downloading
- `extract-links.ts` - Extracts links from a webpage using CSS selectors
- `check-llms-txt.ts` - Checks if a website has an llms.txt file
- `analyze-html-structure.ts` - Analyzes webpage HTML structure for optimal scraping selectors
- `index.ts` - Exports all tool registration functions

## Architecture

Each tool file follows this pattern:

```typescript
// tool-name.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolParams, ToolResponse } from '../types.ts';

/**
 * Handler function - implements the tool logic
 */
async function handleToolName(params: ToolParams): Promise<ToolResponse> {
  // Implementation here
}

/**
 * Registration function - registers the tool with MCP server
 */
export function registerToolNameTool(server: McpServer) {
  server.registerTool(
    'tool_name',
    {
      title: 'Tool Title',
      description: 'Tool description',
      inputSchema: {
        // Zod schema for parameters
      },
    },
    async (args) => {
      // Call handler and return formatted response
    }
  );
}
```

## Usage

All tools are registered in `../server.ts`:

```typescript
import { registerScrapeDocumentationTool, ... } from './tools/index.ts';

function createServer() {
  const server = new McpServer(...);

  // Register all tools
  registerScrapeDocumentationTool(server);
  registerPreviewScrapeTool(server);
  registerExtractLinksTool(server);
  registerCheckLlmsTxtTool(server);
  registerAnalyzeHtmlStructureTool(server);

  return server;
}
```

## Adding a New Tool

1. **Create a new file** in this directory (e.g., `my-new-tool.ts`)
2. **Implement the handler function** with your tool logic
3. **Create the registration function** that:
   - Defines the tool name, title, and description
   - Specifies the input schema using Zod
   - Wraps the handler with error handling
4. **Export the registration function** from `index.ts`
5. **Register the tool** in `../server.ts`

### Example

```typescript
// my-new-tool.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface MyToolParams {
  input: string;
}

interface MyToolResponse {
  output: string;
}

async function handleMyTool(params: MyToolParams): Promise<MyToolResponse> {
  return { output: `Processed: ${params.input}` };
}

export function registerMyNewTool(server: McpServer) {
  server.registerTool(
    'my_new_tool',
    {
      title: 'My New Tool',
      description: 'Does something useful',
      inputSchema: {
        input: z.string().describe('Input parameter'),
      },
    },
    async (args) => {
      try {
        const result = await handleMyTool(args as MyToolParams);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: error.message }) }],
          isError: true,
        };
      }
    }
  );
}
```

## Benefits of This Architecture

- **Self-contained**: Each tool is completely independent
- **Easy to maintain**: Find and modify tool logic in one place
- **Clear separation**: Handler logic separate from registration/schema
- **Type-safe**: Full TypeScript type checking
- **Scalable**: Easy to add new tools without touching existing code
- **Testable**: Handler functions can be tested independently
