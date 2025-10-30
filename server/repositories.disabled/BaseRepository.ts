import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../shared/schema.js';

/**
 * Base Repository with common CRUD operations
 * 
 * @template T - The entity type
 * @template TInsert - The insert type for the entity
 */
export abstract class BaseRepository<T, TInsert> {
  protected constructor(
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly table: any
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | undefined> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);
    
    return results[0] as T | undefined;
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    const results = await this.db
      .select()
      .from(this.table);
    
    return results as T[];
  }

  /**
   * Create new entity
   */
  async create(data: TInsert): Promise<T> {
    const results = await this.db
      .insert(this.table)
      .values(data as any)
      .returning();
    
    return results[0] as T;
  }

  /**
   * Update entity by ID
   */
  async update(id: string, updates: Partial<TInsert>): Promise<T | undefined> {
    const results = await this.db
      .update(this.table)
      .set(updates as any)
      .where(eq(this.table.id, id))
      .returning();
    
    return results[0] as T | undefined;
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    await this.db
      .delete(this.table)
      .where(eq(this.table.id, id));
  }

  /**
   * Count entities with optional where clause
   */
  async count(whereClause?: any): Promise<number> {
    const baseQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table);
    
    const result = whereClause 
      ? await baseQuery.where(whereClause)
      : await baseQuery;
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }
}

