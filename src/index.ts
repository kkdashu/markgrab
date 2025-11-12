#!/usr/bin/env bun
// index.ts - 程序入口
import { scrape } from './scraper';
import { parseArgs, showHelp, cliArgsToScraperOptions } from './cli';

/**
 * 主函数
 */
async function main() {
  try {
    const args = Bun.argv.slice(2);

    // 检查是否是 mcp 子命令
    if (args[0] === 'mcp') {
      // 动态导入并启动 MCP server
      const { default: startMcpServer } = await import('./mcp/server.ts');
      await startMcpServer();
      return;
    }

    // 解析命令行参数 (现在是 async)
    const cliArgs = await parseArgs(args);

    // 如果需要显示帮助,则显示后退出
    if (cliArgs.showHelp) {
      showHelp();
      process.exit(0);
    }

    // 转换为 scraper 选项并执行抓取
    const options = cliArgsToScraperOptions(cliArgs);
    await scrape(options);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ ${error.message}`);
    } else {
      console.error('❌ 发生未知错误:', error);
    }
    process.exit(1);
  }
}

// 运行主函数
main();
