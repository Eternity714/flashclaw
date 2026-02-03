// src/utils/rate-limiter.ts

/**
 * 令牌桶速率限制器
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // 每秒补充的令牌数

  constructor(options: {
    maxTokens?: number;    // 桶容量，默认 60
    refillRate?: number;   // 每秒补充令牌数，默认 1
  } = {}) {
    this.maxTokens = options.maxTokens ?? 60;
    this.refillRate = options.refillRate ?? 1;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 尝试获取令牌
   * @returns true 如果获取成功，false 如果被限流
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  /**
   * 等待直到获取令牌
   */
  async acquire(tokens: number = 1): Promise<void> {
    while (!this.tryAcquire(tokens)) {
      const waitTime = Math.ceil((tokens - this.tokens) / this.refillRate * 1000);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 1000)));
    }
  }

  /**
   * 获取当前可用令牌数
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * 获取等待时间（毫秒）
   */
  getWaitTime(tokens: number = 1): number {
    this.refill();
    
    if (this.tokens >= tokens) {
      return 0;
    }
    
    return Math.ceil((tokens - this.tokens) / this.refillRate * 1000);
  }
}

// 全局限流器实例（用于 API 调用）
export const apiRateLimiter = new RateLimiter({
  maxTokens: 60,    // 每分钟最多 60 次
  refillRate: 1,    // 每秒补充 1 个令牌
});

// 用于消息发送的限流器
export const messageRateLimiter = new RateLimiter({
  maxTokens: 30,    // 每分钟最多 30 条消息
  refillRate: 0.5,  // 每 2 秒补充 1 个令牌
});

/**
 * 带限流的函数包装器
 */
export async function withRateLimit<T>(
  limiter: RateLimiter,
  fn: () => Promise<T>,
  tokens: number = 1
): Promise<T> {
  await limiter.acquire(tokens);
  return fn();
}
