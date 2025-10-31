// Кэш в памяти для разработки и тестирования
import { ICache, CacheOptions, CacheItem } from './CacheInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class MemoryCache implements ICache {
  private cache = new Map<string, CacheItem>();
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  async get<T = any>(key: string): Promise<T | null> {
    this.stats.totalRequests++;
    
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Проверяем срок действия
    if (item.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value as T;
  }

  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600; // 1 час по умолчанию
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const item: CacheItem<T> = {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt,
      tags: options.tags,
      namespace: options.namespace
    };

    this.cache.set(key, item);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // Проверяем срок действия
    if (item.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getMany<T = any>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    
    return result;
  }

  async setMany<T = any>(items: Record<string, T>, options: CacheOptions = {}): Promise<void> {
    const promises = Object.entries(items).map(([key, value]) => 
      this.set(key, value, options)
    );
    
    await Promise.all(promises);
  }

  async deleteMany(keys: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  async getByTag(tag: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag) && item.expiresAt > new Date()) {
        result[key] = item.value;
      }
    }
    
    return result;
  }

  async deleteByTag(tag: string): Promise<number> {
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    
    return this.deleteMany(keysToDelete);
  }

  async deleteByTags(tags: string[]): Promise<number> {
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags && item.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }
    
    return this.deleteMany(keysToDelete);
  }

  async getByNamespace(namespace: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    for (const [key, item] of this.cache.entries()) {
      if (item.namespace === namespace && item.expiresAt > new Date()) {
        result[key] = item.value;
      }
    }
    
    return result;
  }

  async deleteByNamespace(namespace: string): Promise<number> {
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.namespace === namespace) {
        keysToDelete.push(key);
      }
    }
    
    return this.deleteMany(keysToDelete);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
  }

  async getStats(): Promise<{
    totalKeys: number;
    totalMemory: number;
    hitRate: number;
    missRate: number;
  }> {
    // Очищаем просроченные элементы
    await this.cleanupExpired();
    
    const totalKeys = this.cache.size;
    const totalMemory = this.estimateMemoryUsage();
    const hitRate = this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0;
    const missRate = this.stats.totalRequests > 0 ? this.stats.misses / this.stats.totalRequests : 0;
    
    return {
      totalKeys,
      totalMemory,
      hitRate,
      missRate
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Проверяем, что кэш работает
      await this.set('health_check', 'ok', { ttl: 1 });
      const value = await this.get('health_check');
      await this.delete('health_check');
      
      return value === 'ok';
    } catch (error) {
      return false;
    }
  }

  async ping(): Promise<boolean> {
    return this.isHealthy();
  }

  // Очистка просроченных элементов
  private async cleanupExpired(): Promise<void> {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        keysToDelete.push(key);
      }
    }
    
    if (keysToDelete.length > 0) {
      await this.deleteMany(keysToDelete);
    }
  }

  // Оценка использования памяти
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      // Примерная оценка размера ключа и значения
      totalSize += key.length * 2; // UTF-16
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 100; // Размер метаданных
    }
    
    return totalSize;
  }

  // Получение всех ключей (для отладки)
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Получение элемента по ключу (для отладки)
  getItem(key: string): CacheItem | null {
    return this.cache.get(key) || null;
  }
}



