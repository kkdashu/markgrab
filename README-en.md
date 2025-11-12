# markgrab

English | [简体中文](./README.md)

![markgrab screenshot](./screenshots/markgrab-screenshot.jpg)

When developing features with `Claude Code` or `Codex`, the lack of accurate documentation often leads to either not using the most elegant implementation approach, or making up APIs.

For `Claude Code`, the best approach is to put the complete documentation in a project directory, tell the AI the location, and let it look it up itself.

So what I often do is copy documentation from websites to the project directory, have the AI reference it, and then start planning and writing code. Markgrab automates this behavior and supports MCP - tell the AI a documentation URL, and the AI will automatically attempt to scrape the specified URL, convert it to Markdown, and save it.

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

#### Using MCP (Recommended)
```bash
# For example, Claude Code
# Configure MCP
claude mcp add --transport stdio markgrab --scope user -- npx markgrab mcp
```

#### Using npx from Command Line

No installation required, run directly:

```bash
npx markgrab --url=https://bun.com/docs
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
