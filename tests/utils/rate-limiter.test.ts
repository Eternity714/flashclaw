import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });
  });

  it('should allow requests within limit', () => {
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.getAvailableTokens()).toBe(3);
  });

  it('should block requests when exhausted', () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should refill tokens over time', async () => {
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }
    expect(limiter.getAvailableTokens()).toBe(0);
    
    await new Promise(r => setTimeout(r, 1100));
    expect(limiter.getAvailableTokens()).toBeGreaterThanOrEqual(1);
  });
});
