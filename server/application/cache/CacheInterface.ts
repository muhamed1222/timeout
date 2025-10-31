// Интерфейсы для системы кэширования
export interface CacheOptions {
  ttl?: number; // время жизни в секундах
  tags?: string[]; // теги для группировки
  namespace?: string; // пространство имен
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  tags?: string[];
  namespace?: string;
}

export interface ICache {
  // Основные операции
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  
  // Массовые операции
  getMany<T = any>(keys: string[]): Promise<Record<string, T>>;
  setMany<T = any>(items: Record<string, T>, options?: CacheOptions): Promise<void>;
  deleteMany(keys: string[]): Promise<number>;
  
  // Операции с тегами
  getByTag(tag: string): Promise<Record<string, any>>;
  deleteByTag(tag: string): Promise<number>;
  deleteByTags(tags: string[]): Promise<number>;
  
  // Операции с пространством имен
  getByNamespace(namespace: string): Promise<Record<string, any>>;
  deleteByNamespace(namespace: string): Promise<number>;
  
  // Управление
  clear(): Promise<void>;
  getStats(): Promise<{
    totalKeys: number;
    totalMemory: number;
    hitRate: number;
    missRate: number;
  }>;
  
  // Проверка состояния
  isHealthy(): Promise<boolean>;
  ping(): Promise<boolean>;
}



