// Базовый репозиторий с CRUD операциями

import { eq, sql } from 'drizzle-orm';
import {
  BaseEntity,
  PaginationParams,
  PaginatedResponse,
} from '../../shared/types';
import { createPaginatedResponse } from '../../shared/utils';
import { db } from '../lib/database.js';

export abstract class BaseRepository<T extends BaseEntity> {
  protected db = db;
  protected table: any;

  constructor(table: any) {
    this.table = table;
  }

  // Create
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const result = await this.db
      .insert(this.table)
      .values({
        ...data,
        created_at: new Date().toISOString(),
      })
      .returning();

    return result[0] as T;
  }

  // Read
  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findAll(): Promise<T[]> {
    const result = await this.db.select().from(this.table);
    return result as T[];
  }

  async findMany(
    filters: Record<string, any> = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<T>> {
    let query = this.db.select().from(this.table);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(eq(this.table[key], value));
      }
    });

    // Apply pagination
    if (pagination) {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
    }

    const result = await query;
    const total = await this.count(filters);

    return createPaginatedResponse(
      result as T[],
      total,
      pagination || { page: 1, limit: 20 }
    );
  }

  async count(filters: Record<string, any> = {}): Promise<number> {
    let query = this.db.select({ count: sql`count(*)` }).from(this.table);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(eq(this.table[key], value));
      }
    });

    const result = await query;
    return parseInt(result[0].count as string);
  }

  // Update
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<T | null> {
    const result = await this.db
      .update(this.table)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(this.table.id, id))
      .returning();

    return result[0] || null;
  }

  // Delete
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning();

    return result.length > 0;
  }

  // Soft delete (if table has deleted_at field)
  async softDelete(id: string): Promise<T | null> {
    const result = await this.db
      .update(this.table)
      .set({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(this.table.id, id))
      .returning();

    return result[0] || null;
  }

  // Search
  async search(
    searchTerm: string,
    searchFields: string[],
    filters: Record<string, any> = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<T>> {
    let query = this.db.select().from(this.table);

    // Apply search
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields.map(
        field => sql`${this.table[field]} ILIKE ${`%${searchTerm}%`}`
      );
      query = query.where(sql`${sql.join(searchConditions, sql` OR `)}`);
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(eq(this.table[key], value));
      }
    });

    // Apply pagination
    if (pagination) {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);
    }

    const result = await query;
    const total = await this.count(filters);

    return createPaginatedResponse(
      result as T[],
      total,
      pagination || { page: 1, limit: 20 }
    );
  }
}
