// retry.ts - 重试逻辑

/**
 * 睡眠指定时间
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的函数包装器
 * @param fn 要执行的异步函数
 * @param maxRetries 最大重试次数
 * @param baseDelay 基础延迟时间（毫秒）
 * @param retryableErrors 可重试的错误类型（可选）
 * @returns 函数执行结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  retryableErrors?: string[]
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果已经是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        break;
      }

      // 检查是否应该重试此错误
      if (retryableErrors && error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const shouldRetry = retryableErrors.some(retryable =>
          errorMessage.includes(retryable.toLowerCase())
        );

        if (!shouldRetry) {
          // 不可重试的错误，直接抛出
          throw error;
        }
      }

      // 计算延迟时间（指数退避）
      const delay = baseDelay * Math.pow(2, attempt);

      // 等待后重试
      await sleep(delay);
    }
  }

  // 所有重试都失败，抛出最后的错误
  throw lastError;
}

/**
 * 可重试的错误类型列表
 */
export const RETRYABLE_HTTP_ERRORS = [
  'timeout',
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'HTTP 429',  // Too Many Requests
  'HTTP 500',  // Internal Server Error
  'HTTP 502',  // Bad Gateway
  'HTTP 503',  // Service Unavailable
  'HTTP 504',  // Gateway Timeout
];
