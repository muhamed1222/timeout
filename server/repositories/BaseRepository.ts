import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgTable } from "drizzle-orm/pg-core";
import { eq, sql, type SQL } from "drizzle-orm";
import * as schema from "../../shared/schema.js";
import { databaseQueryDuration } from "../lib/metrics.js";
import { logger } from "../lib/logger.js";

/**
 * Base Repository with common CRUD operations
 * 
 * @template T - The entity type
 * @template TInsert - The insert type for the entity
 */
export abstract class BaseRepository<T, TInsert> {
  protected constructor(
    protected readonly db: PostgresJsDatabase<typeof schema>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly table: PgTable<any>,
  ) {}

  /**
   * Helper method to track database queries with metrics and slow query logging
   */
  protected async trackQuery<TResult>(
    operation: string,
    queryFn: () => Promise<TResult>
  ): Promise<TResult> {
    const start = Date.now();
    const tableName = (this.table as any)._.name || 'unknown';
    
    try {
      const result = await queryFn();
      const duration = (Date.now() - start) / 1000;
      
      // Track metrics
      databaseQueryDuration.labels(operation, tableName).observe(duration);
      
      // Log slow queries (>1 second)
      if (duration > 1) {
        logger.warn('Slow query detected', {
          operation,
          table: tableName,
          duration: `${duration.toFixed(3)}s`,
        });
      }
      
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.labels(operation, tableName).observe(duration);
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | undefined> {
    return this.trackQuery('findById', async () => {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id))
      .limit(1);
    
    return results[0] as T | undefined;
    });
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    return this.trackQuery('findAll', async () => {
    const results = await this.db
      .select()
      .from(this.table);
    
    return results as T[];
    });
  }

  /**
   * Create new entity
   */
  async create(data: TInsert): Promise<T> {
    return this.trackQuery('create', async () => {
    const results = await this.db
      .insert(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values(data as any)
      .returning();
    
    return results[0] as T;
    });
  }

  /**
   * Bulk create entities (much faster than individual creates)
   */
  async createMany(dataArray: TInsert[]): Promise<T[]> {
    if (dataArray.length === 0) {
      return [];
    }
    
    return this.trackQuery('createMany', async () => {
    const results = await this.db
      .insert(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values(dataArray as any)
      .returning();
    
    return results as T[];
    });
  }

  /**
   * Update entity by ID
   */
  async update(id: string, updates: Partial<TInsert>): Promise<T | undefined> {
    return this.trackQuery('update', async () => {
    const results = await this.db
      .update(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updates as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id))
      .returning();
    
    return results[0] as T | undefined;
    });
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    return this.trackQuery('delete', async () => {
    await this.db
      .delete(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id));
    });
  }

  /**
   * Count entities with optional where clause
   */
  async count(whereClause?: SQL): Promise<number> {
    return this.trackQuery('count', async () => {
    const baseQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table);
    
    const result = whereClause 
      ? await baseQuery.where(whereClause)
      : await baseQuery;
    
    return Number(result[0]?.count || 0);
    });
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }
}
