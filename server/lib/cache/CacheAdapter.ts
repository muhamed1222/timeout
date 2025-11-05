/**
 * Cache Adapter Interface
 * Provides a common interface for different cache implementations
 */

export interface CacheAdapter {
  /**
   * Get value from cache
   */
  get<T>(_key: string): Promise<T | undefined>;
  
  /**
   * Set value in cache with optional TTL
   */
  set<T>(_key: string, _value: T, _ttl?: number): Promise<void>;
  
  /**
   * Delete value from cache
   */
  delete(_key: string): Promise<void>;
  
  /**
   * Clear all values from cache
   */
  clear(): Promise<void>;
  
  /**
   * Check if key exists
   */
  has(_key: string): Promise<boolean>;
  
  /**
   * Get multiple values
   */
  mget<T>(_keys: string[]): Promise<(T | undefined)[]>;
  
  /**
   * Set multiple values
   */
  mset(_entries: Array<[string, unknown, number?]>): Promise<void>;
}








