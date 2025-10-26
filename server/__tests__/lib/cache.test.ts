import { describe, it, expect, beforeEach, vi } from 'vitest';

// Simple in-memory cache class for testing
class MemoryCache {
  private cache: Map<string, { value: any; expiresAt: number }>;

  constructor() {
    this.cache = new Map();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('test-key', 'test-value', 60);
      expect(cache.get('test-key')).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should store objects', () => {
      const obj = { foo: 'bar', count: 42 };
      cache.set('object-key', obj, 60);
      expect(cache.get('object-key')).toEqual(obj);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      vi.useFakeTimers();
      
      cache.set('expiring-key', 'value', 1); // 1 second TTL
      expect(cache.get('expiring-key')).toBe('value');
      
      // Fast-forward 2 seconds
      vi.advanceTimersByTime(2000);
      
      expect(cache.get('expiring-key')).toBeNull();
      
      vi.useRealTimers();
    });

    it('should not expire entries before TTL', () => {
      vi.useFakeTimers();
      
      cache.set('test-key', 'value', 10); // 10 seconds TTL
      
      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);
      
      expect(cache.get('test-key')).toBe('value');
      
      vi.useRealTimers();
    });
  });

  describe('delete', () => {
    it('should delete a specific key', () => {
      cache.set('key1', 'value1', 60);
      cache.set('key2', 'value2', 60);
      
      cache.delete('key1');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1', 60);
      cache.set('key2', 'value2', 60);
      cache.set('key3', 'value3', 60);
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      cache.set('key1', 'value1', 60);
      cache.set('key2', 'value2', 60);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('cache invalidation pattern', () => {
    it('should support cache-aside pattern', () => {
      const cacheKey = 'company:123:stats';
      
      // Check cache (miss)
      let cached = cache.get(cacheKey);
      expect(cached).toBeNull();
      
      // Fetch from "database" and cache
      const stats = { employees: 10, shifts: 5 };
      cache.set(cacheKey, stats, 120);
      
      // Check cache (hit)
      cached = cache.get(cacheKey);
      expect(cached).toEqual(stats);
      
      // Invalidate on update
      cache.delete(cacheKey);
      
      // Check cache (miss again)
      cached = cache.get(cacheKey);
      expect(cached).toBeNull();
    });
  });
});

