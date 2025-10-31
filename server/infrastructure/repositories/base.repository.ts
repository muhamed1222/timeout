// Базовый репозиторий с общими методами

import { eq } from 'drizzle-orm';
import { db } from '../../lib/database.js';

export abstract class BaseRepository<
  TEntity,
  TInsert,
  TUpdate = Partial<TInsert>,
> {
  protected db = db;

  abstract getTableName(): string;

  abstract findById(id: string): Promise<TEntity | undefined>;

  abstract create(data: TInsert): Promise<TEntity>;

  abstract update(id: string, data: TUpdate): Promise<TEntity | undefined>;

  abstract delete(id: string): Promise<void>;

  abstract findAll(): Promise<TEntity[]>;

  // Общие методы для пагинации
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    _filters?: Record<string, any>
  ): Promise<{ data: TEntity[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Базовая реализация - переопределить в наследниках при необходимости
    const data = await this.findAll();
    const total = data.length;

    return {
      data: data.slice(offset, offset + limit),
      total,
      page,
      limit,
    };
  }

  // Общие методы для поиска
  async search(_query: string, _fields: string[]): Promise<TEntity[]> {
    // Базовая реализация - переопределить в наследниках
    return this.findAll();
  }

  // Общие методы для подсчета
  async count(_filters?: Record<string, any>): Promise<number> {
    const data = await this.findAll();
    return data.length;
  }

  // Общие методы для проверки существования
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== undefined;
  }

  // Общие методы для массовых операций
  async createMany(data: TInsert[]): Promise<TEntity[]> {
    const results: TEntity[] = [];
    for (const item of data) {
      const result = await this.create(item);
      results.push(result);
    }
    return results;
  }

  async updateMany(
    updates: Array<{ id: string; data: TUpdate }>
  ): Promise<TEntity[]> {
    const results: TEntity[] = [];
    for (const update of updates) {
      const result = await this.update(update.id, update.data);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
}
