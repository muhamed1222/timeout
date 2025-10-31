// Базовый Repository с улучшенной функциональностью
import { 
  IRepository, 
  QueryOptions, 
  FilterOptions, 
  SearchOptions, 
  PaginationResult, 
  RepositoryStats,
  Transaction,
  RepositoryConfig,
  RepositoryError,
  EntityNotFoundError,
  DuplicateEntityError
} from './RepositoryInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { CacheConfig } from '../../application/cache/CacheConfig';

export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  protected readonly entityName: string;
  protected readonly config: RepositoryConfig;
  protected readonly cacheKeyPrefix: string;

  constructor(
    entityName: string,
    config: Partial<RepositoryConfig> = {}
  ) {
    this.entityName = entityName;
    this.config = {
      enableCaching: true,
      cacheTTL: 3600,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    this.cacheKeyPrefix = `repo:${entityName}:`;
  }

  // Абстрактные методы для реализации в наследниках
  protected abstract findByIdInternal(id: ID): Promise<T | null>;
  protected abstract findByIdsInternal(ids: ID[]): Promise<T[]>;
  protected abstract findAllInternal(options?: QueryOptions): Promise<T[]>;
  protected abstract createInternal(entity: Partial<T>): Promise<T>;
  protected abstract updateInternal(id: ID, entity: Partial<T>): Promise<T>;
  protected abstract deleteInternal(id: ID): Promise<boolean>;
  protected abstract deleteManyInternal(ids: ID[]): Promise<number>;
  protected abstract findByInternal(filters: FilterOptions, options?: QueryOptions): Promise<T[]>;
  protected abstract findOneInternal(filters: FilterOptions, options?: QueryOptions): Promise<T | null>;
  protected abstract searchInternal(options: SearchOptions): Promise<T[]>;
  protected abstract countInternal(filters?: FilterOptions): Promise<number>;
  protected abstract existsInternal(id: ID): Promise<boolean>;
  protected abstract beginTransactionInternal(): Promise<Transaction>;

  // Основные CRUD операции с кэшированием
  async findById(id: ID): Promise<T | null> {
    try {
      if (this.config.enableCaching) {
        const cached = await this.getFromCache(id);
        if (cached !== null) {
          return cached;
        }
      }

      const entity = await this.findByIdInternal(id);
      
      if (entity && this.config.enableCaching) {
        await this.setCache(id, entity);
      }

      return entity;
    } catch (error) {
      this.logError('findById', error, { id });
      throw this.wrapError(error, 'findById', id);
    }
  }

  async findByIds(ids: ID[]): Promise<T[]> {
    try {
      if (ids.length === 0) {
        return [];
      }

      const results: T[] = [];
      const uncachedIds: ID[] = [];

      if (this.config.enableCaching) {
        for (const id of ids) {
          const cached = await this.getFromCache(id);
          if (cached !== null) {
            results.push(cached);
          } else {
            uncachedIds.push(id);
          }
        }
      } else {
        uncachedIds.push(...ids);
      }

      if (uncachedIds.length > 0) {
        const entities = await this.findByIdsInternal(uncachedIds);
        
        if (this.config.enableCaching) {
          for (const entity of entities) {
            const id = this.extractId(entity);
            await this.setCache(id, entity);
          }
        }
        
        results.push(...entities);
      }

      return results;
    } catch (error) {
      this.logError('findByIds', error, { ids });
      throw this.wrapError(error, 'findByIds');
    }
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    try {
      const entities = await this.findAllInternal(options);
      
      if (this.config.enableCaching && entities.length <= this.config.batchSize) {
        for (const entity of entities) {
          const id = this.extractId(entity);
          await this.setCache(id, entity);
        }
      }

      return entities;
    } catch (error) {
      this.logError('findAll', error, { options });
      throw this.wrapError(error, 'findAll');
    }
  }

  async create(entity: Partial<T>): Promise<T> {
    try {
      this.validateEntity(entity);
      
      const createdEntity = await this.createInternal(entity);
      
      if (this.config.enableCaching) {
        const id = this.extractId(createdEntity);
        await this.setCache(id, createdEntity);
      }

      this.logOperation('create', { id: this.extractId(createdEntity) });
      return createdEntity;
    } catch (error) {
      this.logError('create', error, { entity });
      throw this.wrapError(error, 'create');
    }
  }

  async update(id: ID, entity: Partial<T>): Promise<T> {
    try {
      this.validateEntity(entity);
      
      const updatedEntity = await this.updateInternal(id, entity);
      
      if (this.config.enableCaching) {
        await this.setCache(id, updatedEntity);
      }

      this.logOperation('update', { id });
      return updatedEntity;
    } catch (error) {
      this.logError('update', error, { id, entity });
      throw this.wrapError(error, 'update', id);
    }
  }

  async delete(id: ID): Promise<boolean> {
    try {
      const deleted = await this.deleteInternal(id);
      
      if (deleted && this.config.enableCaching) {
        await this.removeFromCache(id);
      }

      this.logOperation('delete', { id });
      return deleted;
    } catch (error) {
      this.logError('delete', error, { id });
      throw this.wrapError(error, 'delete', id);
    }
  }

  async deleteMany(ids: ID[]): Promise<number> {
    try {
      const deletedCount = await this.deleteManyInternal(ids);
      
      if (deletedCount > 0 && this.config.enableCaching) {
        for (const id of ids) {
          await this.removeFromCache(id);
        }
      }

      this.logOperation('deleteMany', { count: deletedCount });
      return deletedCount;
    } catch (error) {
      this.logError('deleteMany', error, { ids });
      throw this.wrapError(error, 'deleteMany');
    }
  }

  // Поиск и фильтрация
  async findBy(filters: FilterOptions, options?: QueryOptions): Promise<T[]> {
    try {
      return await this.findByInternal(filters, options);
    } catch (error) {
      this.logError('findBy', error, { filters, options });
      throw this.wrapError(error, 'findBy');
    }
  }

  async findOne(filters: FilterOptions, options?: QueryOptions): Promise<T | null> {
    try {
      return await this.findOneInternal(filters, options);
    } catch (error) {
      this.logError('findOne', error, { filters, options });
      throw this.wrapError(error, 'findOne');
    }
  }

  async search(options: SearchOptions): Promise<T[]> {
    try {
      return await this.searchInternal(options);
    } catch (error) {
      this.logError('search', error, { options });
      throw this.wrapError(error, 'search');
    }
  }

  async count(filters?: FilterOptions): Promise<number> {
    try {
      return await this.countInternal(filters);
    } catch (error) {
      this.logError('count', error, { filters });
      throw this.wrapError(error, 'count');
    }
  }

  async exists(id: ID): Promise<boolean> {
    try {
      if (this.config.enableCaching) {
        const cached = await this.getFromCache(id);
        if (cached !== null) {
          return true;
        }
      }

      return await this.existsInternal(id);
    } catch (error) {
      this.logError('exists', error, { id });
      throw this.wrapError(error, 'exists', id);
    }
  }

  // Пагинация
  async findPaginated(
    page: number,
    limit: number,
    filters?: FilterOptions,
    options?: QueryOptions
  ): Promise<PaginationResult<T>> {
    try {
      const offset = (page - 1) * limit;
      const queryOptions = { ...options, limit, offset };

      const [data, total] = await Promise.all([
        this.findByInternal(filters || {}, queryOptions),
        this.countInternal(filters)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      this.logError('findPaginated', error, { page, limit, filters, options });
      throw this.wrapError(error, 'findPaginated');
    }
  }

  // Статистика
  async getStats(): Promise<RepositoryStats> {
    try {
      const totalRecords = await this.countInternal();
      
      return {
        totalRecords,
        lastUpdated: new Date(),
        indexCount: 0, // Заглушка
        cacheHitRate: this.config.enableCaching ? 0.8 : undefined // Заглушка
      };
    } catch (error) {
      this.logError('getStats', error);
      throw this.wrapError(error, 'getStats');
    }
  }

  // Транзакции
  async beginTransaction(): Promise<Transaction> {
    try {
      return await this.beginTransactionInternal();
    } catch (error) {
      this.logError('beginTransaction', error);
      throw this.wrapError(error, 'beginTransaction');
    }
  }

  async withTransaction<R>(callback: (transaction: Transaction) => Promise<R>): Promise<R> {
    const transaction = await this.beginTransaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Кэширование
  async clearCache(): Promise<void> {
    if (!this.config.enableCaching) {
      return;
    }

    try {
      await CacheConfig.clearAll();
      this.logOperation('clearCache');
    } catch (error) {
      this.logError('clearCache', error);
    }
  }

  async warmCache(): Promise<void> {
    if (!this.config.enableCaching) {
      return;
    }

    try {
      const entities = await this.findAllInternal({ limit: this.config.batchSize });
      
      for (const entity of entities) {
        const id = this.extractId(entity);
        await this.setCache(id, entity);
      }

      this.logOperation('warmCache', { count: entities.length });
    } catch (error) {
      this.logError('warmCache', error);
    }
  }

  // Вспомогательные методы
  protected abstract extractId(entity: T): ID;
  protected abstract validateEntity(entity: Partial<T>): void;

  protected async getFromCache(id: ID): Promise<T | null> {
    try {
      const key = `${this.cacheKeyPrefix}${id}`;
      return await CacheConfig.getFromDefault(key);
    } catch (error) {
      this.logError('getFromCache', error, { id });
      return null;
    }
  }

  protected async setCache(id: ID, entity: T): Promise<void> {
    try {
      const key = `${this.cacheKeyPrefix}${id}`;
      await CacheConfig.setToDefault(key, entity, this.config.cacheTTL);
    } catch (error) {
      this.logError('setCache', error, { id });
    }
  }

  protected async removeFromCache(id: ID): Promise<void> {
    try {
      const key = `${this.cacheKeyPrefix}${id}`;
      await CacheConfig.getFromDefault(key); // Проверяем существование
      // Здесь должна быть логика удаления из кэша
    } catch (error) {
      this.logError('removeFromCache', error, { id });
    }
  }

  protected logOperation(operation: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[${this.entityName}] ${operation}:`, data);
    }
  }

  protected logError(operation: string, error: any, data?: any): void {
    if (this.config.enableLogging) {
      console.error(`[${this.entityName}] ${operation} error:`, error, data);
    }
  }

  protected wrapError(error: any, operation: string, entityId?: ID): Error {
    if (error instanceof RepositoryError) {
      return error;
    }

    if (error instanceof DomainException) {
      return new RepositoryError(
        error.message,
        error.code,
        operation,
        entityId?.toString()
      );
    }

    return new RepositoryError(
      error.message || 'Unknown error',
      'REPOSITORY_ERROR',
      operation,
      entityId?.toString()
    );
  }
}



