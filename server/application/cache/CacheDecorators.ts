// Декораторы для автоматического кэширования методов
import { cacheManager } from './CacheManager';
import { CacheOptions } from './CacheInterface';

// Декоратор для кэширования результатов методов
export function Cacheable(options: CacheOptions & { 
  cacheName?: string;
  keyGenerator?: (args: any[]) => string;
  condition?: (args: any[], result: any) => boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      return;
    }
    const originalMethod = descriptor.value;
    const cacheName = options.cacheName || 'default';
    const ttl = options.ttl || 3600; // 1 час по умолчанию

    descriptor.value = async function (...args: any[]) {
      // Генерируем ключ кэша
      const key = options.keyGenerator 
        ? options.keyGenerator(args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      try {
        // Пытаемся получить из кэша
        const cachedResult = await cacheManager.get(key, cacheName);
        
        if (cachedResult !== null) {
          console.log(`Cache hit for ${key}`);
          return cachedResult;
        }

        console.log(`Cache miss for ${key}`);
        
        // Выполняем оригинальный метод
        const result = await originalMethod.apply(this, args);
        
        // Проверяем условие кэширования
        if (options.condition && !options.condition(args, result)) {
          return result;
        }

        // Сохраняем результат в кэш
        await cacheManager.set(key, result, {
          ttl,
          tags: options.tags,
          namespace: options.namespace
        }, cacheName);

        return result;
      } catch (error) {
        console.error(`Cache error for ${key}:`, error);
        // В случае ошибки кэширования выполняем оригинальный метод
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

// Декоратор для инвалидации кэша
export function CacheEvict(options: {
  cacheName?: string;
  keyGenerator?: (args: any[]) => string;
  tags?: string[];
  namespace?: string;
  allEntries?: boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      return;
    }
    const originalMethod = descriptor.value;
    const cacheName = options.cacheName || 'default';

    descriptor.value = async function (...args: any[]) {
      // Выполняем оригинальный метод
      const result = await originalMethod.apply(this, args);

      try {
        if (options.allEntries) {
          // Очищаем весь кэш
          await cacheManager.clear(cacheName);
          console.log(`Cache cleared for ${cacheName}`);
        } else if (options.tags) {
          // Удаляем по тегам
          await cacheManager.deleteByTags(options.tags, cacheName);
          console.log(`Cache evicted by tags: ${options.tags.join(', ')}`);
        } else if (options.namespace) {
          // Удаляем по пространству имен
          await cacheManager.deleteByNamespace(options.namespace, cacheName);
          console.log(`Cache evicted by namespace: ${options.namespace}`);
        } else if (options.keyGenerator) {
          // Удаляем конкретный ключ
          const key = options.keyGenerator(args);
          await cacheManager.delete(key, cacheName);
          console.log(`Cache evicted for key: ${key}`);
        }
      } catch (error) {
        console.error('Cache eviction error:', error);
      }

      return result;
    };

    return descriptor;
  };
}

// Декоратор для обновления кэша
export function CachePut(options: CacheOptions & {
  cacheName?: string;
  keyGenerator?: (args: any[]) => string;
  condition?: (args: any[], result: any) => boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      return;
    }
    const originalMethod = descriptor.value;
    const cacheName = options.cacheName || 'default';
    const ttl = options.ttl || 3600;

    descriptor.value = async function (...args: any[]) {
      // Выполняем оригинальный метод
      const result = await originalMethod.apply(this, args);

      try {
        // Генерируем ключ кэша
        const key = options.keyGenerator 
          ? options.keyGenerator(args)
          : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

        // Проверяем условие кэширования
        if (options.condition && !options.condition(args, result)) {
          return result;
        }

        // Обновляем кэш
        await cacheManager.set(key, result, {
          ttl,
          tags: options.tags,
          namespace: options.namespace
        }, cacheName);

        console.log(`Cache updated for ${key}`);
      } catch (error) {
        console.error('Cache update error:', error);
      }

      return result;
    };

    return descriptor;
  };
}

// Утилиты для генерации ключей
export const KeyGenerators = {
  // Генератор ключа по ID
  byId: (args: any[]) => {
    const id = args[0];
    return `id:${id}`;
  },

  // Генератор ключа по компании
  byCompany: (args: any[]) => {
    const companyId = args[0];
    return `company:${companyId}`;
  },

  // Генератор ключа по сотруднику
  byEmployee: (args: any[]) => {
    const employeeId = args[0];
    return `employee:${employeeId}`;
  },

  // Генератор ключа по смене
  byShift: (args: any[]) => {
    const shiftId = args[0];
    return `shift:${shiftId}`;
  },

  // Генератор ключа по дате
  byDate: (args: any[]) => {
    const date = args[0];
    return `date:${date}`;
  },

  // Генератор ключа по статусу
  byStatus: (args: any[]) => {
    const status = args[0];
    return `status:${status}`;
  },

  // Комбинированный генератор
  combined: (fields: string[]) => (args: any[]) => {
    const values = fields.map(field => {
      const index = parseInt(field);
      return !isNaN(index) ? args[index] : field;
    });
    return values.join(':');
  }
};

// Утилиты для условий кэширования
export const CacheConditions = {
  // Кэшировать только успешные результаты
  onlySuccess: (args: any[], result: any) => {
    return result !== null && result !== undefined;
  },

  // Кэшировать только если результат не пустой
  onlyNonEmpty: (args: any[], result: any) => {
    if (Array.isArray(result)) {
      return result.length > 0;
    }
    if (typeof result === 'object' && result !== null) {
      return Object.keys(result).length > 0;
    }
    return result !== null && result !== undefined && result !== '';
  },

  // Кэшировать только если результат содержит данные
  onlyWithData: (args: any[], result: any) => {
    if (Array.isArray(result)) {
      return result.length > 0;
    }
    if (typeof result === 'object' && result !== null) {
      return Object.keys(result).length > 0;
    }
    return result !== null && result !== undefined;
  }
};
