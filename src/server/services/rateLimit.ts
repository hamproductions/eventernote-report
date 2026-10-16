import { Elysia } from 'elysia';

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter(ts => ts > cutoff);

    if (timestamps.length >= this.maxRequests) {
      this.hits.set(key, timestamps);
      const retryAfterSeconds = Math.ceil((timestamps[0] + this.windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter(ts => ts > cutoff);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  get size(): number {
    return this.hits.size;
  }
}

export const rateLimit = (maxRequests = 60, windowMs = 60_000) => {
  const limiter = new RateLimiter(maxRequests, windowMs);

  setInterval(() => limiter.cleanup(), 5 * 60 * 1000);

  return new Elysia({ name: 'rateLimit' }).onBeforeHandle(
    { as: 'scoped' },
    ({ request, server, set }) => {
      if (new URL(request.url).pathname.endsWith('/progress')) return;
      const key =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        server?.requestIP(request)?.address ??
        'local';

      const { allowed, retryAfterSeconds } = limiter.check(key);

      if (!allowed) {
        set.status = 429;
        set.headers['Retry-After'] = String(retryAfterSeconds);
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests. Retry after ${retryAfterSeconds} seconds.`
          }
        };
      }
    }
  );
};
