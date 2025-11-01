import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cache } from '../cache';

describe('Cache', () => {
  beforeEach(() => {
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('get and set', () => {
    it('should store and retrieve string values', () => {
      cache.set('test-key', 'test-value');
      const result = cache.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should store and retrieve object values', () => {
      const testObject = { id: 1, name: 'Test', nested: { value: 'nested' } };
      cache.set('object-key', testObject);
      const result = cache.get('object-key');
      expect(result).toEqual(testObject);
    });

    it('should store and retrieve array values', () => {
      const testArray = [1, 2, 3, { id: 4 }];
      cache.set('array-key', testArray);
      const result = cache.get('array-key');
      expect(result).toEqual(testArray);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key', 'value1');
      expect(cache.get('key')).toBe('value1');

      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });

    it('should handle null values', () => {
      cache.set('null-key', null);
      const result = cache.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      cache.set('undefined-key', undefined);
      const result = cache.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle boolean values', () => {
      cache.set('true-key', true);
      cache.set('false-key', false);
      expect(cache.get('true-key')).toBe(true);
      expect(cache.get('false-key')).toBe(false);
    });

    it('should handle number values including zero', () => {
      cache.set('zero-key', 0);
      cache.set('number-key', 42);
      expect(cache.get('zero-key')).toBe(0);
      expect(cache.get('number-key')).toBe(42);
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should respect TTL and expire entries', () => {
      cache.set('ttl-key', 'value', 300); // 5 minutes

      // Should exist immediately
      expect(cache.get('ttl-key')).toBe('value');

      // Should exist after 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(cache.get('ttl-key')).toBe('value');

      // Should be expired after 6 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(cache.get('ttl-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cache.set('default-ttl-key', 'value'); // Default is usually 300s

      expect(cache.get('default-ttl-key')).toBe('value');

      // Advance time by default TTL
      vi.advanceTimersByTime(300 * 1000);
      expect(cache.get('default-ttl-key')).toBeNull();
    });

    it('should handle custom TTL values', () => {
      cache.set('short-ttl', 'value', 10); // 10 seconds

      expect(cache.get('short-ttl')).toBe('value');

      vi.advanceTimersByTime(5 * 1000);
      expect(cache.get('short-ttl')).toBe('value');

      vi.advanceTimersByTime(6 * 1000);
      expect(cache.get('short-ttl')).toBeNull();
    });

    it('should reset TTL when value is updated', () => {
      cache.set('reset-ttl', 'value1', 60);

      vi.advanceTimersByTime(50 * 1000); // 50 seconds

      // Update value (should reset TTL)
      cache.set('reset-ttl', 'value2', 60);

      // Should still exist after another 50 seconds (total 100s)
      vi.advanceTimersByTime(50 * 1000);
      expect(cache.get('reset-ttl')).toBe('value2');

      // Should expire after another 20 seconds (total 120s, but TTL was reset at 50s)
      vi.advanceTimersByTime(20 * 1000);
      expect(cache.get('reset-ttl')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('delete-key', 'value');
      expect(cache.get('delete-key')).toBe('value');

      cache.delete('delete-key');
      expect(cache.get('delete-key')).toBeNull();
    });

    it('should handle deleting non-existent keys', () => {
      expect(() => cache.delete('non-existent')).not.toThrow();
    });

    it('should delete only specified key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.delete('key2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should handle clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });

  describe('Pattern-based operations', () => {
    it('should delete keys matching a pattern', () => {
      cache.set('company:1:stats', { users: 10 });
      cache.set('company:2:stats', { users: 20 });
      cache.set('company:1:settings', { theme: 'dark' });
      cache.set('user:1:profile', { name: 'John' });

      // Delete all company stats
      cache.delete('company:*:stats');

      expect(cache.get('company:1:stats')).toBeNull();
      expect(cache.get('company:2:stats')).toBeNull();
      expect(cache.get('company:1:settings')).not.toBeNull();
      expect(cache.get('user:1:profile')).not.toBeNull();
    });

    it('should delete keys with prefix pattern', () => {
      cache.set('company:1:stats', { users: 10 });
      cache.set('company:1:settings', { theme: 'dark' });
      cache.set('company:2:stats', { users: 20 });

      // Delete all company:1 keys
      cache.delete('company:1:*');

      expect(cache.get('company:1:stats')).toBeNull();
      expect(cache.get('company:1:settings')).toBeNull();
      expect(cache.get('company:2:stats')).not.toBeNull();
    });

    it('should handle pattern with no matches', () => {
      cache.set('user:1:profile', { name: 'John' });

      expect(() => cache.delete('company:*')).not.toThrow();
      expect(cache.get('user:1:profile')).not.toBeNull();
    });
  });

  describe('Cache invalidation scenarios', () => {
    it('should invalidate company stats after shift update', () => {
      const companyId = 'comp-123';
      const stats = {
        activeShifts: 5,
        totalEmployees: 20,
        violations: 2,
      };

      cache.set(`company:${companyId}:stats`, stats, 300);
      expect(cache.get(`company:${companyId}:stats`)).toEqual(stats);

      // Simulate shift update
      cache.delete(`company:${companyId}:stats`);

      expect(cache.get(`company:${companyId}:stats`)).toBeNull();
    });

    it('should handle multiple cache keys for the same entity', () => {
      const employeeId = 'emp-456';

      cache.set(`employee:${employeeId}:profile`, { name: 'John' });
      cache.set(`employee:${employeeId}:shifts`, [1, 2, 3]);
      cache.set(`employee:${employeeId}:rating`, 95);

      // Invalidate all employee data
      cache.delete(`employee:${employeeId}:*`);

      expect(cache.get(`employee:${employeeId}:profile`)).toBeNull();
      expect(cache.get(`employee:${employeeId}:shifts`)).toBeNull();
      expect(cache.get(`employee:${employeeId}:rating`)).toBeNull();
    });
  });

  describe('Concurrent access', () => {
    it('should handle rapid consecutive gets and sets', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      for (let i = 0; i < iterations; i++) {
        expect(cache.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should handle get/set/delete operations in sequence', () => {
      cache.set('key', 'value1');
      expect(cache.get('key')).toBe('value1');

      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');

      cache.delete('key');
      expect(cache.get('key')).toBeNull();

      cache.set('key', 'value3');
      expect(cache.get('key')).toBe('value3');
    });
  });

  describe('Memory management', () => {
    it('should handle large objects', () => {
      const largeObject = {
        data: Array(1000).fill({ id: 1, name: 'test', value: 'data' }),
      };

      cache.set('large-object', largeObject);
      const result = cache.get('large-object');

      expect(result).toEqual(largeObject);
      expect(result.data).toHaveLength(1000);
    });

    it('should handle many cache entries', () => {
      const entryCount = 1000;

      for (let i = 0; i < entryCount; i++) {
        cache.set(`entry-${i}`, { id: i, value: `value-${i}` });
      }

      // Spot check some entries
      expect(cache.get('entry-0')).toEqual({ id: 0, value: 'value-0' });
      expect(cache.get('entry-500')).toEqual({ id: 500, value: 'value-500' });
      expect(cache.get('entry-999')).toEqual({ id: 999, value: 'value-999' });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as key', () => {
      cache.set('', 'empty-key-value');
      expect(cache.get('')).toBe('empty-key-value');
    });

    it('should handle keys with special characters', () => {
      const specialKeys = [
        'key:with:colons',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key with spaces',
      ];

      specialKeys.forEach((key) => {
        cache.set(key, `value-for-${key}`);
        expect(cache.get(key)).toBe(`value-for-${key}`);
      });
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      cache.set(longKey, 'value');
      expect(cache.get(longKey)).toBe('value');
    });

    it('should preserve object references correctly', () => {
      const original = { id: 1, nested: { value: 'test' } };
      cache.set('ref-key', original);

      const retrieved = cache.get('ref-key');

      // Should be equal but not the same reference (deep copy)
      expect(retrieved).toEqual(original);
      
      // Modifying retrieved should not affect original
      if (retrieved && typeof retrieved === 'object') {
        (retrieved as any).id = 2;
      }
      
      expect(original.id).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should not throw on malformed operations', () => {
      expect(() => cache.get(null as any)).not.toThrow();
      expect(() => cache.get(undefined as any)).not.toThrow();
      expect(() => cache.set(null as any, 'value')).not.toThrow();
      expect(() => cache.delete(null as any)).not.toThrow();
    });
  });
});





