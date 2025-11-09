# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Running the Application

```bash
# Basic usage - scrape a single page
bun src/index.ts --url=https://example.com/docs

# With configuration file
bun src/index.ts --url=https://example.com/docs --config=config.toml

# Preview mode (dry run)
bun src/index.ts --url=https://example.com/docs --dry-run

# Type checking
bun run type-check
```

## Architecture

markgrab is a web documentation scraper that converts HTML documentation into Markdown files. The architecture follows a modular design with clear separation of concerns:

### Core Data Flow

1. **CLI Layer** (`cli.ts`) - Parses command-line arguments and loads TOML configuration files, merging them with CLI parameters (priority: CLI > config file > defaults)
2. **Main Entry** (`index.ts`) - Coordinates the CLI and scraper modules
3. **Scraper Layer** (`scraper.ts`) - Core business logic that orchestrates three scraping strategies:
   - **llms.txt mode** (highest priority): Automatically detects and uses llms.txt files to get structured documentation links
   - **Follow links mode**: Uses CSS selectors to extract and follow links from a page
   - **Single page mode**: Scrapes only the specified URL
4. **Supporting Modules**:
   - `llms-txt.ts` - Parses llms.txt Markdown files into structured data
   - `config.ts` - Handles TOML configuration loading and domain-specific configs
   - `progress.ts` - Real-time progress tracking with visual progress bars
   - `retry.ts` - Exponential backoff retry logic for network requests

### Key Design Patterns

**Strategy Pattern**: The scraper uses a priority-based strategy selection:
- Tries llms.txt first (if `useLlmsTxt` is enabled)
- Falls back to CSS selector-based link following (if `followLinksSelector` is provided)
- Defaults to single page scraping

**Native Markdown First**: For each URL, the scraper:
1. First attempts to fetch the native Markdown source by trying multiple .md URL patterns (e.g., `/page.html` ’ `/page.md`, `/docs/guide/` ’ `/docs/guide/index.md`)
2. Falls back to HTML fetching and conversion using Turndown if native Markdown is unavailable

**Concurrency Control**: Uses `p-limit` to cap concurrent requests (default: 10) to avoid overwhelming target servers, with automatic retry on failure using exponential backoff.

**Progress Tracking**: The `ProgressTracker` class provides real-time feedback during multi-page scraping operations, throttling updates to avoid excessive output.

### File Organization

- Domain-based output: Files are saved to `<outputDir>/<domain>/` to organize scraped content by source
- Filename sanitization: Page titles are converted to safe filenames (lowercase, special chars removed, spaces to underscores)

### Configuration Hierarchy

Configuration can come from three sources (in priority order):
1. CLI arguments (highest priority)
2. TOML config file with domain-specific settings
3. Built-in defaults (lowest priority)

The TOML config uses domain names as keys, allowing different scraping strategies per website.

## Bun APIs

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- `Bun.write()` is used for file writing operations

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
