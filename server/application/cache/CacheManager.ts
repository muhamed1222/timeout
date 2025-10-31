// Менеджер кэша для управления всеми кэшами в системе
import { ICache, CacheOptions } from './CacheInterface';
import { MemoryCache } from './MemoryCache';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class CacheManager {
  private caches = new Map<string, ICache>();
  private static instance: CacheManager;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Создание кэша
  createCache(name: string, type: 'memory' = 'memory'): ICache {
    if (this.caches.has(name)) {
      throw new DomainException(`Cache '${name}' already exists`, 'CACHE_EXISTS');
    }

    let cache: ICache;
    
    switch (type) {
    case 'memory':
      cache = new MemoryCache();
      break;
    default:
      throw new DomainException(`Unsupported cache type: ${type}`, 'UNSUPPORTED_CACHE_TYPE');
    }

    this.caches.set(name, cache);
    console.log(`Cache '${name}' created with type '${type}'`);
    
    return cache;
  }

  // Получение кэша
  getCache(name: string): ICache {
    const cache = this.caches.get(name);
    if (!cache) {
      throw new DomainException(`Cache '${name}' not found`, 'CACHE_NOT_FOUND');
    }
    return cache;
  }

  // Проверка существования кэша
  hasCache(name: string): boolean {
    return this.caches.has(name);
  }

  // Удаление кэша
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  // Получение списка всех кэшей
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  // Получение статистики всех кэшей
  async getAllStats(): Promise<Record<string, {
    totalKeys: number;
    totalMemory: number;
    hitRate: number;
    missRate: number;
  }>> {
    const stats: Record<string, any> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = await cache.getStats();
    }
    
    return stats;
  }

  // Операции с кэшем по умолчанию
  async get<T = any>(key: string, cacheName: string = 'default'): Promise<T | null> {
    const cache = this.getCache(cacheName);
    return cache.get<T>(key);
  }

  async set<T = any>(key: string, value: T, options?: CacheOptions, cacheName: string = 'default'): Promise<void> {
    const cache = this.getCache(cacheName);
    return cache.set(key, value, options);
  }

  async delete(key: string, cacheName: string = 'default'): Promise<boolean> {
    const cache = this.getCache(cacheName);
    return cache.delete(key);
  }

  async exists(key: string, cacheName: string = 'default'): Promise<boolean> {
    const cache = this.getCache(cacheName);
    return cache.exists(key);
  }

  // Массовые операции
  async getMany<T = any>(keys: string[], cacheName: string = 'default'): Promise<Record<string, T>> {
    const cache = this.getCache(cacheName);
    return cache.getMany<T>(keys);
  }

  async setMany<T = any>(items: Record<string, T>, options?: CacheOptions, cacheName: string = 'default'): Promise<void> {
    const cache = this.getCache(cacheName);
    return cache.setMany(items, options);
  }

  async deleteMany(keys: string[], cacheName: string = 'default'): Promise<number> {
    const cache = this.getCache(cacheName);
    return cache.deleteMany(keys);
  }

  // Операции с тегами
  async getByTag(tag: string, cacheName: string = 'default'): Promise<Record<string, any>> {
    const cache = this.getCache(cacheName);
    return cache.getByTag(tag);
  }

  async deleteByTag(tag: string, cacheName: string = 'default'): Promise<number> {
    const cache = this.getCache(cacheName);
    return cache.deleteByTag(tag);
  }

  async deleteByTags(tags: string[], cacheName: string = 'default'): Promise<number> {
    const cache = this.getCache(cacheName);
    return cache.deleteByTags(tags);
  }

  // Операции с пространством имен
  async getByNamespace(namespace: string, cacheName: string = 'default'): Promise<Record<string, any>> {
    const cache = this.getCache(cacheName);
    return cache.getByNamespace(namespace);
  }

  async deleteByNamespace(namespace: string, cacheName: string = 'default'): Promise<number> {
    const cache = this.getCache(cacheName);
    return cache.deleteByNamespace(namespace);
  }

  // Управление
  async clear(cacheName: string = 'default'): Promise<void> {
    const cache = this.getCache(cacheName);
    return cache.clear();
  }

  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.clear());
    await Promise.all(promises);
    console.log('All caches cleared');
  }

  // Проверка состояния
  async isHealthy(cacheName: string = 'default'): Promise<boolean> {
    const cache = this.getCache(cacheName);
    return cache.isHealthy();
  }

  async ping(cacheName: string = 'default'): Promise<boolean> {
    const cache = this.getCache(cacheName);
    return cache.ping();
  }

  // Проверка состояния всех кэшей
  async getAllHealthy(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      health[name] = await cache.isHealthy();
    }
    
    return health;
  }
}

// Singleton instance
export const cacheManager = CacheManager.getInstance();



