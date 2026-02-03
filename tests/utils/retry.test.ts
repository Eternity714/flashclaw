import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError } from '../../src/utils/retry.js';

describe('withRetry', () => {
  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'));
    
    await expect(withRetry(fn, { maxRetries: 2, initialDelay: 10 }))
      .rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('isRetryableError', () => {
  it('should return true for timeout errors', () => {
    expect(isRetryableError(new Error('connection timeout'))).toBe(true);
  });

  it('should return true for rate limit errors', () => {
    expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isRetryableError(new Error('invalid input'))).toBe(false);
  });
});
