import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const namespace = process.env.EVENTERNOTE_CACHE_NAMESPACE || 'eventernote-v1';
if (!/^[a-zA-Z0-9_-]+$/.test(namespace)) throw new Error('Invalid Eventernote cache namespace');
const directory = join(process.cwd(), '.cache', namespace);

function cachePath(key: string): string {
  return join(directory, `${createHash('sha256').update(key).digest('hex')}.json`);
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const entry = {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000
    };
    this.cache.set(key, entry);
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(cachePath(key), JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to persist Eventernote cache:', error);
    }
  }

  get<T>(key: string): T | null {
    let entry = this.cache.get(key);
    if (!entry) {
      try {
        entry = JSON.parse(readFileSync(cachePath(key), 'utf8'), (name, value) =>
          name === 'parsedDate' && typeof value === 'string' ? new Date(value) : value
        );
        if (entry && Number.isFinite(entry.expiresAt)) this.cache.set(key, entry);
        else entry = undefined;
      } catch {
        return null;
      }
    }

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
    try {
      unlinkSync(cachePath(key));
    } catch {}
  }

  clear(): void {
    this.cache.clear();
    try {
      for (const file of readdirSync(directory)) {
        if (/^[a-f0-9]{64}\.json$/.test(file)) unlinkSync(join(directory, file));
      }
    } catch {}
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Run cleanup every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);
