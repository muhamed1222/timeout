// Конфигурация системы кэширования
import { cacheManager } from './CacheManager';

export class CacheConfig {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Создаем кэши для разных типов данных
    const defaultCache = cacheManager.createCache('default', 'memory');
    const employeeCache = cacheManager.createCache('employees', 'memory');
    const shiftCache = cacheManager.createCache('shifts', 'memory');
    const companyCache = cacheManager.createCache('companies', 'memory');
    const statsCache = cacheManager.createCache('stats', 'memory');

    this.initialized = true;
    console.log('Cache system initialized with caches:', cacheManager.getCacheNames());
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getCacheStats(): Promise<Record<string, any>> {
    return cacheManager.getAllStats();
  }

  // Методы для работы с кэшами
  static async getFromDefault<T = any>(key: string): Promise<T | null> {
    return cacheManager.get<T>(key, 'default');
  }

  static async setToDefault<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return cacheManager.set(key, value, { ttl }, 'default');
  }

  static async getEmployee<T = any>(key: string): Promise<T | null> {
    return cacheManager.get<T>(key, 'employees');
  }

  static async setEmployee<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return cacheManager.set(key, value, { ttl, tags: ['employee'] }, 'employees');
  }

  static async getShift<T = any>(key: string): Promise<T | null> {
    return cacheManager.get<T>(key, 'shifts');
  }

  static async setShift<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return cacheManager.set(key, value, { ttl, tags: ['shift'] }, 'shifts');
  }

  static async getCompany<T = any>(key: string): Promise<T | null> {
    return cacheManager.get<T>(key, 'companies');
  }

  static async setCompany<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return cacheManager.set(key, value, { ttl, tags: ['company'] }, 'companies');
  }

  static async getStats<T = any>(key: string): Promise<T | null> {
    return cacheManager.get<T>(key, 'stats');
  }

  static async setStats<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    return cacheManager.set(key, value, { ttl, tags: ['stats'] }, 'stats');
  }

  // Методы для инвалидации кэша
  static async evictEmployee(employeeId: string): Promise<void> {
    await cacheManager.delete(`employee:${employeeId}`, 'employees');
    await cacheManager.deleteByTag('employee', 'employees');
  }

  static async evictShift(shiftId: string): Promise<void> {
    await cacheManager.delete(`shift:${shiftId}`, 'shifts');
    await cacheManager.deleteByTag('shift', 'shifts');
  }

  static async evictCompany(companyId: string): Promise<void> {
    await cacheManager.delete(`company:${companyId}`, 'companies');
    await cacheManager.deleteByTag('company', 'companies');
  }

  static async evictStats(): Promise<void> {
    await cacheManager.deleteByTag('stats', 'stats');
  }

  // Методы для массовых операций
  static async getManyEmployees<T = any>(keys: string[]): Promise<Record<string, T>> {
    return cacheManager.getMany<T>(keys, 'employees');
  }

  static async setManyEmployees<T = any>(items: Record<string, T>, ttl?: number): Promise<void> {
    return cacheManager.setMany(items, { ttl, tags: ['employee'] }, 'employees');
  }

  static async getManyShifts<T = any>(keys: string[]): Promise<Record<string, T>> {
    return cacheManager.getMany<T>(keys, 'shifts');
  }

  static async setManyShifts<T = any>(items: Record<string, T>, ttl?: number): Promise<void> {
    return cacheManager.setMany(items, { ttl, tags: ['shift'] }, 'shifts');
  }

  // Методы для управления кэшами
  static async clearAll(): Promise<void> {
    return cacheManager.clearAll();
  }

  static async clearEmployees(): Promise<void> {
    return cacheManager.clear('employees');
  }

  static async clearShifts(): Promise<void> {
    return cacheManager.clear('shifts');
  }

  static async clearCompanies(): Promise<void> {
    return cacheManager.clear('companies');
  }

  static async clearStats(): Promise<void> {
    return cacheManager.clear('stats');
  }

  // Проверка состояния
  static async isHealthy(): Promise<boolean> {
    const health = await cacheManager.getAllHealthy();
    return Object.values(health).every(status => status);
  }

  static async getHealthStatus(): Promise<Record<string, boolean>> {
    return cacheManager.getAllHealthy();
  }
}

// Константы для TTL (время жизни кэша)
export const CACHE_TTL = {
  // Короткое время жизни (5 минут)
  SHORT: 300,
  
  // Среднее время жизни (1 час)
  MEDIUM: 3600,
  
  // Долгое время жизни (24 часа)
  LONG: 86400,
  
  // Очень долгое время жизни (7 дней)
  VERY_LONG: 604800,
  
  // Специфичные TTL
  EMPLOYEE: 3600, // 1 час
  SHIFT: 1800,    // 30 минут
  COMPANY: 7200,  // 2 часа
  STATS: 900,     // 15 минут
} as const;

// Константы для тегов кэша
export const CACHE_TAGS = {
  EMPLOYEE: 'employee',
  SHIFT: 'shift',
  COMPANY: 'company',
  STATS: 'stats',
  DASHBOARD: 'dashboard',
  REPORT: 'report',
} as const;

// Константы для пространств имен
export const CACHE_NAMESPACES = {
  EMPLOYEES: 'employees',
  SHIFTS: 'shifts',
  COMPANIES: 'companies',
  STATS: 'stats',
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
} as const;



