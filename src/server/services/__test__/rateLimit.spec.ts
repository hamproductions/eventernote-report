import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../rateLimit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(3, 1000);

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('blocks requests over the limit with retryAfterSeconds', () => {
    const limiter = new RateLimiter(2, 10_000);

    limiter.check('a');
    limiter.check('a');

    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(10);

    vi.advanceTimersByTime(4000);

    const stillBlocked = limiter.check('a');
    expect(stillBlocked.allowed).toBe(false);
    expect(stillBlocked.retryAfterSeconds).toBe(6);
  });

  it('allows again after the window expires', () => {
    const limiter = new RateLimiter(1, 1000);

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(limiter.check('a').allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter(1, 1000);

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    expect(limiter.check('b').allowed).toBe(false);
  });

  it('prunes stale keys on cleanup', () => {
    const limiter = new RateLimiter(1, 1000);

    limiter.check('a');
    limiter.check('b');
    expect(limiter.size).toBe(2);

    vi.advanceTimersByTime(1001);
    limiter.check('b');
    limiter.cleanup();

    expect(limiter.size).toBe(1);
  });
});
