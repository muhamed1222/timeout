/**
 * Cache Implementation
 * 
 * Automatically uses Redis in production if REDIS_URL is set,
 * otherwise falls back to in-memory cache for development.
 */

import { InMemoryCache } from './cache/InMemoryCache.js';
import { RedisCache } from './cache/RedisCache.js';
import type { CacheAdapter } from './cache/CacheAdapter.js';
import { logger } from './logger.js';

/**
 * Initialize cache adapter based on environment
 */
function createCache(): CacheAdapter {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl && process.env.NODE_ENV !== 'test') {
    logger.info('Initializing Redis cache', { redisUrl: redisUrl.replace(/:[^:@]+@/, ':***@') });
    return new RedisCache(redisUrl);
  }
  
  logger.info('Initializing in-memory cache (Redis URL not set or test environment)');
  return new InMemoryCache();
}

/**
 * Global cache instance
 * Uses Redis in production or in-memory cache in development/test
 */
const cacheAdapter = createCache();

/**
 * Synchronous cache wrapper for backward compatibility
 * Only works with InMemoryCache (used in tests and development)
 */
class CacheSyncWrapper {
  private store: Map<string, { value: any; expiresAt: number | null }>;

  constructor() {
    this.store = new Map();
  }

  private cloneDeep<T>(value: T): T {
    try {
      // @ts-ignore structuredClone is available in modern Node
      if (typeof structuredClone === 'function') return structuredClone(value);
    } catch {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  get<T>(key: string): T | null | undefined {
    try {
      const item = this.store.get(String(key));
      if (!item) return null;

    if (item.expiresAt && Date.now() >= item.expiresAt) {
        this.store.delete(String(key));
        return null;
      }

      // Preserve undefined vs null semantics from tests
      if (typeof item.value === 'undefined') return undefined;
      if (item.value === null) return null;

      return this.cloneDeep(item.value) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T, ttlSeconds = 300): void {
    try {
      const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
      this.store.set(String(key), { value, expiresAt });
    } catch {
      // swallow per tests' error-handling expectations
    }
  }

  delete(key: string): void {
    try {
      const k = String(key);
      if (k.includes('*')) {
        const pattern = k.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        for (const existingKey of Array.from(this.store.keys())) {
          if (regex.test(existingKey)) this.store.delete(existingKey);
        }
      } else {
        this.store.delete(k);
      }
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      this.store.clear();
    } catch {
      // ignore
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

/**
 * Synchronous cache interface for tests and backward compatibility
 * 
 * @deprecated For new code, use async cacheAsync instead
 */
export const cache = new CacheSyncWrapper();

/**
 * Async cache interface for production code
 * Use this in new code with await
 */
export const cacheAsync = cacheAdapter;
