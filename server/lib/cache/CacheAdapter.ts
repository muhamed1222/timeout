/**
 * Cache Adapter Interface
 * Provides a common interface for different cache implementations
 */

export interface CacheAdapter {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | undefined>;
  
  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  /**
   * Delete value from cache
   */
  delete(key: string): Promise<void>;
  
  /**
   * Clear all values from cache
   */
  clear(): Promise<void>;
  
  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get multiple values
   */
  mget<T>(keys: string[]): Promise<(T | undefined)[]>;
  
  /**
   * Set multiple values
   */
  mset(entries: Array<[string, any, number?]>): Promise<void>;
}





