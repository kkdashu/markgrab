// progress.ts - 进度追踪和统计

export interface ProgressStats {
  total: number;
  completed: number;
  success: number;
  failed: number;
  skipped: number;
  inProgress: number;
  errors: Array<{ url: string; error: string }>;
}

/**
 * 进度追踪器类
 */
export class ProgressTracker {
  private stats: ProgressStats;
  private startTime: number;
  private lastUpdate: number = 0;
  private updateInterval: number = 100; // 最小更新间隔（毫秒）

  constructor(total: number) {
    this.stats = {
      total,
      completed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      inProgress: 0,
      errors: [],
    };
    this.startTime = Date.now();
  }

  /**
   * 开始处理一个页面
   */
  start(): void {
    this.stats.inProgress++;
    this.update();
  }

  /**
   * 标记一个页面成功完成
   */
  success(): void {
    this.stats.inProgress--;
    this.stats.completed++;
    this.stats.success++;
    this.update();
  }

  /**
   * 标记一个页面失败
   */
  fail(url: string, error: string): void {
    this.stats.inProgress--;
    this.stats.completed++;
    this.stats.failed++;
    this.stats.errors.push({ url, error });
    this.update();
  }

  /**
   * 标记一个页面被跳过
   */
  skip(): void {
    this.stats.inProgress--;
    this.stats.completed++;
    this.stats.skipped++;
    this.update();
  }

  /**
   * 更新进度显示
   */
  private update(): void {
    const now = Date.now();
    // 限制更新频率，避免输出过多
    if (now - this.lastUpdate < this.updateInterval && this.stats.completed < this.stats.total) {
      return;
    }
    this.lastUpdate = now;

    // 清除当前行并显示进度
    const percentage = Math.floor((this.stats.completed / this.stats.total) * 100);
    const progressBar = this.renderProgressBar(percentage);

    // 使用 \r 回到行首，覆盖之前的进度
    process.stdout.write(`\r${progressBar} ${percentage}% (${this.stats.completed}/${this.stats.total})`);
    process.stdout.write(` | ✅ ${this.stats.success}`);
    if (this.stats.failed > 0) {
      process.stdout.write(` ❌ ${this.stats.failed}`);
    }
    if (this.stats.skipped > 0) {
      process.stdout.write(` ⏭️  ${this.stats.skipped}`);
    }
    if (this.stats.inProgress > 0) {
      process.stdout.write(` ⏳ ${this.stats.inProgress}`);
    }

    // 完成时换行
    if (this.stats.completed === this.stats.total) {
      process.stdout.write('\n');
    }
  }

  /**
   * 渲染进度条
   */
  private renderProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * 显示最终统计信息
   */
  showSummary(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log('\n=== 抓取完成 ===');
    console.log(`总计: ${this.stats.total} 个页面`);
    console.log(`✅ 成功: ${this.stats.success}`);

    if (this.stats.failed > 0) {
      console.log(`❌ 失败: ${this.stats.failed}`);

      // 显示失败的 URL 和错误信息
      console.log('\n失败页面详情:');
      for (const { url, error } of this.stats.errors) {
        console.log(`  - ${url}`);
        console.log(`    错误: ${error}`);
      }
    }

    if (this.stats.skipped > 0) {
      console.log(`⏭️  跳过: ${this.stats.skipped}`);
    }

    console.log(`⏱️  耗时: ${duration}s`);
  }

  /**
   * 获取当前统计信息
   */
  getStats(): Readonly<ProgressStats> {
    return { ...this.stats };
  }
}
