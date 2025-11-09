# markgrab

English | [简体中文](./README.md)

A fast, intelligent web documentation scraper that converts website documentation into Markdown format.

## ✨ Core Features

- 🤖 **Smart Scraping**: Auto-detect [llms.txt](https://llmstxt.org) or use CSS selectors
- ⚡ **High Performance**: Concurrent scraping + progress display + auto-retry
- 📝 **Native Markdown**: Prioritize fetching `.md` source files, auto-convert HTML on failure
- 🎯 **Three Modes**: Auto-select llms.txt / follow links / single page mode
- ⚙️ **Flexible Configuration**: Support TOML config files and CLI arguments

## Quick Start

```bash
# Install dependencies
bun install

# Simplest usage - scrape a single page
bun src/index.ts --url=https://bun.com/docs/installation

# Auto-detect llms.txt - scrape entire site (recommended)
bun src/index.ts --url=https://bun.com/docs

# Use CSS selector - scrape multiple pages
bun src/index.ts --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

## Usage Guide

### Basic Usage

```bash
bun src/index.ts --url=<url> [options]
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
bun src/index.ts --url=https://bun.com/docs --dry-run
```

Shows what will be scraped without actually downloading.

#### 2. Auto-detect llms.txt

```bash
bun src/index.ts --url=https://hono.dev/docs
```

If the website provides llms.txt, automatically use it to get documentation structure.

#### 3. Use CSS Selectors

```bash
bun src/index.ts --url=https://bun.com/docs \
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
bun src/index.ts --url=https://bun.com/docs --config=config.toml
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
bun src/index.ts --url=https://bun.com/docs --dry-run
```

### How to scrape only the main content area?

Use `--content` to specify a selector:

```bash
bun src/index.ts --url=https://example.com --content=article
```

### How to scrape an entire documentation site?

Use `--follow` to specify a link selector:

```bash
bun src/index.ts --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

### Where are files saved?

Files are saved to `<output>/<domain>/` directory by default, for example:

- Output directory: `./` (default)
- URL: `https://bun.com/docs/installation`
- Save location: `./bun.com/installation.md`

## Tech Stack

- [Bun](https://bun.sh) - JavaScript runtime
- [Cheerio](https://cheerio.js.org) - HTML parsing
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [p-limit](https://github.com/sindresorhus/p-limit) - Concurrency control

## License

MIT
