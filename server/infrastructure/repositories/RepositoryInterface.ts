// Интерфейсы для улучшенного паттерна Repository
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  select?: string[];
  include?: string[];
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SearchOptions {
  query: string;
  fields: string[];
  options?: QueryOptions;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RepositoryStats {
  totalRecords: number;
  lastUpdated: Date;
  indexCount: number;
  cacheHitRate?: number;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export interface IRepository<T, ID = string> {
  // Основные CRUD операции
  findById(id: ID): Promise<T | null>;
  findByIds(ids: ID[]): Promise<T[]>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  deleteMany(ids: ID[]): Promise<number>;

  // Поиск и фильтрация
  findBy(filters: FilterOptions, options?: QueryOptions): Promise<T[]>;
  findOne(filters: FilterOptions, options?: QueryOptions): Promise<T | null>;
  search(options: SearchOptions): Promise<T[]>;
  count(filters?: FilterOptions): Promise<number>;
  exists(id: ID): Promise<boolean>;

  // Пагинация
  findPaginated(
    page: number,
    limit: number,
    filters?: FilterOptions,
    options?: QueryOptions
  ): Promise<PaginationResult<T>>;

  // Статистика
  getStats(): Promise<RepositoryStats>;

  // Транзакции
  beginTransaction(): Promise<Transaction>;
  withTransaction<R>(callback: (transaction: Transaction) => Promise<R>): Promise<R>;

  // Кэширование
  clearCache(): Promise<void>;
  warmCache(): Promise<void>;
}

export interface IReadOnlyRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findByIds(ids: ID[]): Promise<T[]>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findBy(filters: FilterOptions, options?: QueryOptions): Promise<T[]>;
  findOne(filters: FilterOptions, options?: QueryOptions): Promise<T | null>;
  search(options: SearchOptions): Promise<T[]>;
  count(filters?: FilterOptions): Promise<number>;
  exists(id: ID): Promise<boolean>;
  findPaginated(
    page: number,
    limit: number,
    filters?: FilterOptions,
    options?: QueryOptions
  ): Promise<PaginationResult<T>>;
  getStats(): Promise<RepositoryStats>;
}

export interface IWriteOnlyRepository<T, ID = string> {
  create(entity: Partial<T>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  deleteMany(ids: ID[]): Promise<number>;
  beginTransaction(): Promise<Transaction>;
  withTransaction<R>(callback: (transaction: Transaction) => Promise<R>): Promise<R>;
}

export interface IRepositoryFactory {
  createRepository<T, ID = string>(entityName: string): IRepository<T, ID>;
  createReadOnlyRepository<T, ID = string>(entityName: string): IReadOnlyRepository<T, ID>;
  createWriteOnlyRepository<T, ID = string>(entityName: string): IWriteOnlyRepository<T, ID>;
}

export interface RepositoryConfig {
  enableCaching: boolean;
  cacheTTL: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
}

export class RepositoryError extends DomainException {
  constructor(
    message: string,
    code: string,
    public readonly operation: string,
    public readonly entityId?: string
  ) {
    super(message, code);
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityId: string, entityType: string) {
    super(
      `${entityType} with id ${entityId} not found`,
      'ENTITY_NOT_FOUND',
      'findById',
      entityId
    );
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entityType: string, field: string, value: string) {
    super(
      `${entityType} with ${field} '${value}' already exists`,
      'DUPLICATE_ENTITY',
      'create'
    );
  }
}

export class RepositoryValidationError extends RepositoryError {
  constructor(message: string, field: string) {
    super(
      `Validation error: ${message}`,
      'REPOSITORY_VALIDATION_ERROR',
      'validate',
      field
    );
  }
}



