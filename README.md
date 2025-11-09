# markgrab

[English](./README-en.md) | 简体中文

一个快速、智能的网页文档抓取工具，将网站文档转换为 Markdown 格式。

## ✨ 核心特性

- 🤖 **智能抓取**: 自动检测 [llms.txt](https://llmstxt.org) 或使用 CSS 选择器
- ⚡ **高性能**: 并发抓取 + 进度显示 + 自动重试
- 📝 **原生 Markdown**: 优先获取 `.md` 源文件，失败自动转换 HTML
- 🎯 **三种模式**: 自动选择 llms.txt / 跟随链接 / 单页模式
- ⚙️ **灵活配置**: 支持 TOML 配置文件和命令行参数

## 安装

### 前置要求

本工具基于 [Bun](https://bun.sh) 运行时构建，使用前需要先安装 Bun：

```bash
# macOS / Linux / WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1|iex"
```

### 使用方式

#### 方式 1: 使用 npx（推荐）

无需安装，直接运行：

```bash
npx markgrab --url=https://bun.com/docs
```

#### 方式 2: 全局安装

```bash
# 全局安装
bun add -g markgrab

# 然后直接使用
markgrab --url=https://bun.com/docs
```

#### 方式 3: 本地开发

```bash
# 克隆仓库
git clone <repository-url>
cd markgrab

# 安装依赖
bun install

# 运行
bun src/index.ts --url=https://bun.com/docs
```

## 快速开始

```bash
# 最简单的用法 - 抓取单页
npx markgrab --url=https://bun.com/docs/installation

# 自动检测 llms.txt - 抓取整站（推荐）
npx markgrab --url=https://bun.com/docs

# 使用 CSS 选择器 - 抓取多页
npx markgrab --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

## 使用指南

### 基础用法

```bash
markgrab --url=<url> [选项]
# 或使用 npx
npx markgrab --url=<url> [选项]
```

**常用选项：**

| 选项 | 说明 | 示例 |
|------|------|------|
| `--url=<url>` | 要抓取的 URL（必需） | `--url=https://bun.com/docs` |
| `--follow=<selector>` | CSS 选择器，跟随链接抓取 | `--follow='nav a'` |
| `--content=<selector>` | 内容区域选择器（默认 `body`） | `--content=main` |
| `--output=<dir>` | 输出目录（默认 `./`） | `--output=./docs` |
| `--dry-run` | 预览模式，不实际抓取 | - |
| `--config=<path>` | 配置文件路径 | `--config=config.toml` |

**高级选项：**

| 选项 | 说明 |
|------|------|
| `--no-native-md` | 禁用原生 Markdown，强制 HTML 转换 |
| `--no-llms-txt` | 禁用 llms.txt 自动检测 |
| `--include-optional` | 包含 llms.txt 中的 Optional 部分 |
| `--help`, `-h` | 显示帮助信息 |

### 抓取规则

工具按以下优先级自动选择抓取方式：

1. **llms.txt 模式** → 如果检测到 `llms.txt`
2. **跟随链接模式** → 如果设置了 `--follow`
3. **单页模式** → 其他情况

### 使用示例

#### 1. 预览模式（推荐先预览）

```bash
markgrab --url=https://bun.com/docs --dry-run
```

显示将要抓取的内容，不实际下载。

#### 2. 自动检测 llms.txt

```bash
markgrab --url=https://hono.dev/docs
```

如果网站提供 llms.txt，自动使用它获取文档结构。

#### 3. 使用 CSS 选择器

```bash
markgrab --url=https://bun.com/docs \
  --follow='a[href^="/docs/"]' \
  --content=main \
  --output=./my_docs
```

#### 4. 使用配置文件

创建 `config.toml`：

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

使用配置：

```bash
markgrab --url=https://bun.com/docs --config=config.toml
```

**配置优先级**: CLI 参数 > 配置文件 > 默认值

## 性能特性

### 进度显示

抓取时实时显示进度条和统计：

```
🚀 开始抓取 296 个文档...

[████████████░░░░░░░░] 60% (178/296) | ✅ 176 ❌ 2 ⏳ 10

=== 抓取完成 ===
总计: 296 个页面
✅ 成功: 294
❌ 失败: 2
⏱️  耗时: 8.1s
```

### 自动重试

网络请求失败时自动重试（默认 3 次），使用指数退避策略。

### 并发控制

默认最多 10 个并发请求，避免对目标网站造成压力。

## 配置文件

### 可配置选项

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `followLinksSelector` | string | 跟随链接的 CSS 选择器 |
| `contentAreaSelector` | string | 内容区域选择器 |
| `outputDir` | string | 输出目录 |
| `useNativeMd` | boolean | 是否尝试原生 Markdown（默认 `true`） |
| `useLlmsTxt` | boolean | 是否自动检测 llms.txt（默认 `true`） |
| `includeOptional` | boolean | 是否包含 Optional 部分（默认 `false`） |

### 配置文件示例

参考 `config.example.toml`：

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

# 单页模式示例
["example.com"]
contentAreaSelector = "body"
outputDir = "./output_docs"
useNativeMd = true
useLlmsTxt = false
```

## 常见问题

### 如何查看将要抓取什么？

使用 `--dry-run` 预览：

```bash
markgrab --url=https://bun.com/docs --dry-run
```

### 如何只抓取主要内容区域？

使用 `--content` 指定选择器：

```bash
markgrab --url=https://example.com --content=article
```

### 如何抓取整个文档站点？

使用 `--follow` 指定链接选择器：

```bash
markgrab --url=https://bun.com/docs --follow='a[href^="/docs/"]'
```

### 文件保存在哪里？

默认保存到 `<output>/<域名>/` 目录下，例如：

- 输出目录: `./` (默认)
- URL: `https://bun.com/docs/installation`
- 保存位置: `./bun.com/installation.md`

## MCP 服务器集成

markgrab 现已支持 [Model Context Protocol (MCP)](https://modelcontextprotocol.io)，可以作为 MCP 服务器运行，让 AI 助手（如 Claude）直接调用文档抓取功能。

### 配置 MCP 服务器

#### 在 Claude Code CLI 中使用

在项目的 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "markgrab": {
      "command": "bun",
      "args": ["x", "markgrab-mcp"]
    }
  }
}
```

### 可用的 MCP 工具

配置完成后，AI 助手可以使用以下工具：

1. **`scrape_documentation`** - 抓取网站文档并转换为 Markdown
   - 支持自动检测 llms.txt
   - 支持 CSS 选择器跟随链接
   - 支持单页抓取
   - 并发抓取，自动重试

2. **`preview_scrape`** - 预览将要抓取的页面（不实际抓取）
   - 验证选择器是否正确
   - 查看将要抓取的页面列表
   - 估算抓取范围

3. **`extract_links`** - 从页面提取链接
   - 使用 CSS 选择器提取链接
   - 返回链接标题和 URL
   - 测试选择器

4. **`check_llms_txt`** - 检查网站是否有 llms.txt
   - 显示文档结构
   - 查看各部分的链接数量
   - 识别可选部分

5. **`analyze_html_structure`** - 🆕 AI 驱动的 HTML 结构分析
   - 自动分析网页 HTML 结构
   - AI 智能推荐最佳 CSS 选择器
   - 识别常见文档框架（MkDocs、Docusaurus、Read the Docs 等）
   - 返回 `contentAreaSelector` 和 `followLinksSelector` 建议

### 使用示例

与 AI 助手对话：

```
用户: 帮我抓取 Bun 的文档
AI: 我来帮你抓取 Bun 的文档...
[调用 scrape_documentation 工具]

用户: 先预览一下会抓取哪些页面
AI: 好的，我先预览一下...
[调用 preview_scrape 工具]

用户: 这个网站有 llms.txt 吗？
AI: 让我检查一下...
[调用 check_llms_txt 工具]

用户: 帮我分析一下 https://docs.fastlane.tools/ 应该用什么选择器
AI: 我来分析这个网站的 HTML 结构...
[调用 analyze_html_structure 工具]
根据分析，这是一个 Read the Docs 主题的网站，建议使用：
- contentAreaSelector: .wy-nav-content
- followLinksSelector: .wy-menu-vertical a
```


## 技术栈

- [Bun](https://bun.sh) - JavaScript 运行时
- [Cheerio](https://cheerio.js.org) - HTML 解析
- [Turndown](https://github.com/mixmark-io/turndown) - HTML 转 Markdown
- [p-limit](https://github.com/sindresorhus/p-limit) - 并发控制

## License

MIT
