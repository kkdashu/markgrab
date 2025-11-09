// analyze-html-structure.ts - Analyze HTML Structure Tool
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { load } from 'cheerio';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import type {
  AnalyzeHtmlParams,
  AnalyzeHtmlResponse,
} from '../types.ts';

/**
 * Generate a safe filename from URL
 */
function sanitizeFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '-');
    const pathname = urlObj.pathname.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
    const timestamp = Date.now();
    return `${hostname}${pathname}-${timestamp}.html`;
  } catch {
    return `analysis-${Date.now()}.html`;
  }
}

/**
 * Ensure temp directory exists
 */
async function ensureTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), 'markgrab-analysis');
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Simplify HTML structure for AI analysis
 * Removes text content but keeps structure, classes, and IDs
 */
function simplifyHtml(html: string): string {
  const $ = load(html);

  // Remove scripts, styles, comments, SVGs, and images to reduce token usage
  $('script, style, noscript, iframe, svg, img, picture, video, audio, canvas').remove();

  // Function to recursively simplify elements
  function simplifyElement(element: any): string {
    const $el = $(element);
    const tagName = element.name;

    if (!tagName) return '';

    // Get important attributes
    const attrs: string[] = [];
    const id = $el.attr('id');
    const className = $el.attr('class');
    const role = $el.attr('role');
    const href = $el.attr('href');

    if (id) attrs.push(`id="${id}"`);
    if (className) attrs.push(`class="${className}"`);
    if (role) attrs.push(`role="${role}"`);
    if (href && tagName === 'a') {
      // Simplify href for readability
      const simplifiedHref = href.length > 50 ? href.substring(0, 47) + '...' : href;
      attrs.push(`href="${simplifiedHref}"`);
    }

    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    // Get children
    const children = $el.children().toArray();

    if (children.length === 0) {
      // Leaf node - show truncated text content
      let text = $el.text().trim();
      if (text.length > 30) {
        text = text.substring(0, 27) + '...';
      }
      if (text) {
        return `<${tagName}${attrString}>${text}</${tagName}>`;
      }
      return `<${tagName}${attrString} />`;
    }

    // Has children - recursively process
    const childrenHtml = children.map(child => simplifyElement(child)).filter(Boolean).join('\n  ');

    if (childrenHtml) {
      return `<${tagName}${attrString}>\n  ${childrenHtml}\n</${tagName}>`;
    }
    return `<${tagName}${attrString} />`;
  }

  // Start from body or html
  const body = $('body');
  if (body.length > 0) {
    return simplifyElement(body[0]);
  }

  return simplifyElement($('html')[0] || $.root()[0]);
}

/**
 * Handler for analyze_html_structure tool
 */
async function handleAnalyzeHtml(
  params: AnalyzeHtmlParams
): Promise<AnalyzeHtmlResponse> {
  // Validate URL
  try {
    new URL(params.url);
  } catch (error) {
    throw new Error(`Invalid URL: ${params.url}`);
  }

  // Fetch the HTML
  const response = await fetch(params.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${params.url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Simplify HTML for AI analysis
  const simplifiedHtml = simplifyHtml(html);

  // Write to temporary file
  const tempDir = await ensureTempDir();
  const filename = sanitizeFilename(params.url);
  const tempFilePath = join(tempDir, filename);

  await Bun.write(tempFilePath, simplifiedHtml);

  // Generate preview (first 1000 characters)
  const preview = simplifiedHtml.length > 1000
    ? simplifiedHtml.substring(0, 1000) + '...\n\n[truncated - see full file for complete structure]'
    : simplifiedHtml;

  return {
    url: params.url,
    tempFilePath,
    fileSize: simplifiedHtml.length,
    preview,
  };
}

/**
 * Register the analyze_html_structure tool with the MCP server
 */
export function registerAnalyzeHtmlStructureTool(server: McpServer) {
  server.registerTool(
    'analyze_html_structure',
    {
      title: 'Analyze HTML Structure',
      description: `Analyze a webpage's HTML structure to determine optimal CSS selectors for scraping.

This tool fetches a webpage and returns both the original and a simplified HTML structure.
The simplified HTML is optimized for AI analysis - it preserves the DOM structure,
classes, IDs, and roles, but removes most text content to reduce token usage.

**IMPORTANT INSTRUCTIONS FOR AI ANALYSIS:**

When you receive the simplified HTML, you should analyze it to identify:

1. **Content Area Selector (contentAreaSelector)**:
   - Look for the main content container that holds the documentation
   - Common patterns: <main>, <article>, elements with class="content", "documentation", "doc-content", "markdown-body"
   - Avoid headers, footers, sidebars, and navigation elements
   - The selector should target the area with the actual documentation text

2. **Navigation Links Selector (followLinksSelector)**:
   - Look for navigation menus that link to other documentation pages
   - Common patterns: <nav> elements, sidebars with class="sidebar", "toc", "navigation"
   - Should select <a> tags that link to documentation pages (not external links)
   - Examples: "nav a", ".sidebar a", "aside.navigation a"

3. **Common Documentation Frameworks to Recognize**:
   - **MkDocs**: Look for class="md-content", "md-sidebar"
   - **Docusaurus**: Look for class="theme-doc-markdown", "menu__link"
   - **Read the Docs**: Look for class="wy-nav-content", "wy-menu-vertical"
   - **GitBook**: Look for class="page-inner", "summary"
   - **Sphinx**: Look for class="document", "sphinxsidebar"
   - **VitePress/VuePress**: Look for class="content", "sidebar-links"

4. **Your Response Format**:
Return a JSON object with:
{
  "contentAreaSelector": "main",
  "followLinksSelector": "nav a",
  "confidence": "high|medium|low",
  "reasoning": "Explanation of why these selectors were chosen",
  "detectedFramework": "MkDocs|Docusaurus|ReadTheDocs|Custom|Unknown"
}

**Analysis Tips**:
- Prioritize semantic HTML elements (main, nav, article) over generic divs
- Look for consistent class naming patterns
- Check href attributes on links to distinguish internal vs external links
- If multiple candidates exist, choose the most specific selector`,
      inputSchema: {
        url: z.string().describe('The URL of the webpage to analyze'),
      },
    },
    async (args) => {
      try {
        const result = await handleAnalyzeHtml(args as AnalyzeHtmlParams);
        return {
          content: [
            {
              type: 'text' as const,
              text: `# HTML Structure Analysis for: ${result.url}

## Analysis File Generated

The simplified HTML structure has been saved to a temporary file for analysis:

**File Path:** \`${result.tempFilePath}\`
**File Size:** ${result.fileSize} characters (${Math.round(result.fileSize / 1024)} KB)

## Preview (First 1000 characters)

\`\`\`html
${result.preview}
\`\`\`

---

## Instructions for Analysis

**Please use the Read tool to read the full HTML structure from the file above.**

You can:
1. Read the entire file to understand the overall structure
2. Use Grep to search for specific patterns (e.g., \`nav\`, \`sidebar\`, \`content\`, \`menu\`)
3. Use Read with offset/limit to examine specific sections

**After analyzing the structure, provide:**
1. Recommended \`contentAreaSelector\` - CSS selector for the main documentation content
2. Recommended \`followLinksSelector\` - CSS selector for navigation links to other docs
3. Confidence level (high/medium/low)
4. Reasoning for your choices
5. Detected documentation framework (if recognizable)

Please return your analysis as a JSON object.`,
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
