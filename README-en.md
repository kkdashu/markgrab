# markgrab

English | [简体中文](./README.md)

A fast, intelligent web documentation scraper that converts website documentation into Markdown format.

## ✨ Core Features

- 🤖 **Smart Scraping**: Auto-detect [llms.txt](https://llmstxt.org) or use CSS selectors
- ⚡ **High Performance**: Concurrent scraping + progress display + auto-retry
- 📝 **Native Markdown**: Prioritize fetching `.md` source files, auto-convert HTML on failure
- 🎯 **Three Modes**: Auto-select llms.txt / follow links / single page mode
- ⚙️ **Flexible Configuration**: Support TOML config files and CLI arguments

## Installation

### Prerequisites

This tool is built on the [Bun](https://bun.sh) runtime. You need to install Bun first:

```bash
# macOS / Linux / WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1|iex"
```

### Usage Options

#### Option 1: Using npx (Recommended)

No installation required, run directly:

```bash
npx markgrab --url=https://bun.com/docs
```

#### Option 2: Global Installation

```bash
# Install globally
bun add -g markgrab

# Then use directly
markgrab --url=https://bun.com/docs
```

#### Option 3: Local Development

```bash
# Clone repository
git clone https://github.com/kkdashu/markgrab
cd markgrab

# Install dependencies
bun install

# Run
bun src/index.ts --url=https://bun.com/docs
```

## Quick Start

```bash
# Simplest usage - scrape a single page
npx markgrab --url=https://bun.com/docs/installation

# Auto-detect llms.txt - scrape entire site (recommended)
npx markgrab --url=https://bun.com/docs

# Use CSS selector - scrape multiple pages
npx markgrab --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

## Usage Guide

### Basic Usage

```bash
markgrab --url=<url> [options]
# Or using npx
npx markgrab --url=<url> [options]
```

**Common Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `--url=<url>` | URL to scrape (required) | `--url=https://bun.com/docs` |
| `--follow=<selector>` | CSS selector to follow links | `--follow='nav a'` |
| `--content=<selector>` | Content area selector (default `body`) | `--content=main` |
| `--output=<dir>` | Output directory (default `./`) | `--output=./docs` |
| `--dry-run` | Preview mode, no actual scraping | - |
| `--config=<path>` | Config file path | `--config=config.toml` |

**Advanced Options:**

| Option | Description |
|--------|-------------|
| `--no-native-md` | Disable native Markdown, force HTML conversion |
| `--no-llms-txt` | Disable llms.txt auto-detection |
| `--include-optional` | Include Optional sections from llms.txt |
| `--help`, `-h` | Show help message |

### Scraping Rules

The tool automatically selects the scraping method in the following priority:

1. **llms.txt Mode** → If `llms.txt` is detected
2. **Follow Links Mode** → If `--follow` is set
3. **Single Page Mode** → Otherwise

### Usage Examples

#### 1. Preview Mode (recommended to preview first)

```bash
markgrab --url=https://bun.com/docs --dry-run
```

Shows what will be scraped without actually downloading.

#### 2. Auto-detect llms.txt

```bash
markgrab --url=https://hono.dev/docs
```

If the website provides llms.txt, automatically use it to get documentation structure.

#### 3. Use CSS Selectors

```bash
markgrab --url=https://bun.com/docs \
  --follow='a[href^="/docs/"]' \
  --content=main \
  --output=./my_docs
```

#### 4. Use Config File

Create `config.toml`:

```toml
["bun.com"]
followLinksSelector = "a[href^='/docs/']"
contentAreaSelector = "main"
outputDir = "./docs"
useNativeMd = true
useLlmsTxt = true
includeOptional = false

["hono.dev"]
followLinksSelector = "nav a"
contentAreaSelector = "article"
outputDir = "./docs"
```

Use the config:

```bash
markgrab --url=https://bun.com/docs --config=config.toml
```

**Configuration Priority**: CLI arguments > Config file > Default values

## Performance Features

### Progress Display

Real-time progress bar and statistics during scraping:

```
🚀 Starting to scrape 296 documents...

[████████████░░░░░░░░] 60% (178/296) | ✅ 176 ❌ 2 ⏳ 10

=== Scraping Complete ===
Total: 296 pages
✅ Success: 294
❌ Failed: 2
⏱️  Duration: 8.1s
```

### Auto-retry

Automatic retry on network request failures (default 3 times) using exponential backoff strategy.

### Concurrency Control

Maximum 10 concurrent requests by default to avoid overwhelming the target website.

## Configuration File

### Configurable Options

| Config Item | Type | Description |
|-------------|------|-------------|
| `followLinksSelector` | string | CSS selector for links to follow |
| `contentAreaSelector` | string | Content area selector |
| `outputDir` | string | Output directory |
| `useNativeMd` | boolean | Whether to try native Markdown (default `true`) |
| `useLlmsTxt` | boolean | Whether to auto-detect llms.txt (default `true`) |
| `includeOptional` | boolean | Whether to include Optional sections (default `false`) |

### Config File Example

See `config.example.toml`:

```toml
["bun.com"]
followLinksSelector = "a[href^='/docs/']"
contentAreaSelector = "main"
outputDir = "./output_docs"
useNativeMd = true
useLlmsTxt = true
includeOptional = false

["hono.dev"]
followLinksSelector = "nav a"
contentAreaSelector = "article"
outputDir = "./output_docs"
useNativeMd = true
useLlmsTxt = true
includeOptional = false

# Single page mode example
["example.com"]
contentAreaSelector = "body"
outputDir = "./output_docs"
useNativeMd = true
useLlmsTxt = false
```

## FAQ

### How to see what will be scraped?

Use `--dry-run` to preview:

```bash
markgrab --url=https://bun.com/docs --dry-run
```

### How to scrape only the main content area?

Use `--content` to specify a selector:

```bash
markgrab --url=https://example.com --content=article
```

### How to scrape an entire documentation site?

Use `--follow` to specify a link selector:

```bash
markgrab --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

### Where are files saved?

Files are saved to `<output>/<domain>/` directory by default, for example:

- Output directory: `./` (default)
- URL: `https://bun.com/docs/installation`
- Save location: `./bun.com/installation.md`

## MCP Server Integration

markgrab now supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing it to run as an MCP server so AI assistants (like Claude) can directly call documentation scraping functionality.

### Configuring the MCP Server

#### Using with Claude Code CLI

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "markgrab": {
      "command": "npx",
      "args": ["markgrab", "mcp"]
    }
  }
}
```

### Available MCP Tools

Once configured, AI assistants can use these tools:

1. **`scrape_documentation`** - Scrape website documentation and convert to Markdown
   - Auto-detect llms.txt support
   - CSS selector link following
   - Single page scraping
   - Concurrent scraping with auto-retry

2. **`preview_scrape`** - Preview pages to be scraped (without actually scraping)
   - Validate selectors
   - View list of pages to scrape
   - Estimate scraping scope

3. **`extract_links`** - Extract links from a page
   - Use CSS selectors to extract links
   - Return link titles and URLs
   - Test selectors

4. **`check_llms_txt`** - Check if a website has llms.txt
   - Display documentation structure
   - View link counts per section
   - Identify optional sections

5. **`analyze_html_structure`** - 🆕 AI-Powered HTML Structure Analysis
   - Automatically analyze webpage HTML structure
   - AI-powered recommendation of optimal CSS selectors
   - Recognize common documentation frameworks (MkDocs, Docusaurus, Read the Docs, etc.)
   - Returns suggested `contentAreaSelector` and `followLinksSelector`

### Usage Examples

Conversing with an AI assistant:

```
User: Help me scrape the Bun documentation
AI: I'll help you scrape the Bun documentation...
[Calls scrape_documentation tool]

User: Preview which pages would be scraped first
AI: Sure, let me preview that...
[Calls preview_scrape tool]

User: Does this site have llms.txt?
AI: Let me check...
[Calls check_llms_txt tool]

User: Analyze https://docs.fastlane.tools/ and suggest the best selectors
AI: Let me analyze the HTML structure of this website...
[Calls analyze_html_structure tool]
Based on the analysis, this is a Read the Docs themed site. I recommend:
- contentAreaSelector: .wy-nav-content
- followLinksSelector: .wy-menu-vertical a
```

## Tech Stack

- [Bun](https://bun.sh) - JavaScript runtime
- [Cheerio](https://cheerio.js.org) - HTML parsing
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [p-limit](https://github.com/sindresorhus/p-limit) - Concurrency control

## License

MIT
