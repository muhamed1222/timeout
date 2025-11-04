/**
 * Unit tests for BaseRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from '../../../server/BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../server/../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

describe('BaseRepository', () => {
  let mockDb: PostgresJsDatabase<typeof schema>;
  let repository: BaseRepository<any, any>;
  let mockTable: any;

  beforeEach(() => {
    // Mock table with proper structure for trackQuery
    mockTable = {
      id: 'id',
      name: 'name',
      _: {
        name: 'test_table',
      },
    };

    // Mock database with query builder methods
    mockDb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    } as any;

    // Create concrete repository class for testing
    class TestRepository extends BaseRepository<any, any> {
      constructor(db: PostgresJsDatabase<typeof schema>, table: any) {
        super(db, table);
      }
    }

    repository = new TestRepository(mockDb, mockTable);
  });

  describe('findById', () => {
    it('should find entity by ID', async () => {
      const mockResult = [{ id: '1', name: 'Test' }];
      
      // Mock the query chain properly
      const mockLimit = {
        then: (resolve: any) => resolve(mockResult),
      };
      const mockWhere = {
        limit: vi.fn().mockReturnValue(mockLimit),
      };
      const mockFrom = {
        where: vi.fn().mockReturnValue(mockWhere),
      };
      const mockSelect = {
        from: vi.fn().mockReturnValue(mockFrom),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findById('1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockTable);
      expect(result).toEqual(mockResult[0]);
    });

    it('should return undefined if not found', async () => {
      // Mock the query chain properly
      const mockLimit = {
        then: (resolve: any) => resolve([]),
      };
      const mockWhere = {
        limit: vi.fn().mockReturnValue(mockLimit),
      };
      const mockFrom = {
        where: vi.fn().mockReturnValue(mockWhere),
      };
      const mockSelect = {
        from: vi.fn().mockReturnValue(mockFrom),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.findById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const mockResult = [{ id: '1' }, { id: '2' }];
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await repository.findAll();

      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create entity', async () => {
      const insertData = { name: 'New Entity' };
      const mockResult = [{ id: '1', ...insertData }];
      
      const mockValues = {
        returning: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.values = vi.fn().mockReturnValue(mockValues);
      mockDb.insert = vi.fn().mockReturnValue({
        values: mockDb.values,
      });

      const result = await repository.create(insertData);

      expect(mockDb.insert).toHaveBeenCalledWith(mockTable);
      expect(mockDb.values).toHaveBeenCalledWith(insertData);
      expect(result).toEqual(mockResult[0]);
    });
  });

  describe('createMany', () => {
    it('should create multiple entities', async () => {
      const insertData = [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
      ];
      const mockResult = [
        { id: '1', ...insertData[0] },
        { id: '2', ...insertData[1] },
      ];
      
      const mockValues = {
        returning: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.values = vi.fn().mockReturnValue(mockValues);
      mockDb.insert = vi.fn().mockReturnValue({
        values: mockDb.values,
      });

      const result = await repository.createMany(insertData);

      expect(result).toEqual(mockResult);
    });

    it('should return empty array if no data', async () => {
      const result = await repository.createMany([]);
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updates = { name: 'Updated' };
      const mockResult = [{ id: '1', ...updates }];
      
      const mockSet = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockResult),
        }),
      };
      mockDb.set = vi.fn().mockReturnValue(mockSet);
      mockDb.update = vi.fn().mockReturnValue({
        set: mockDb.set,
      });

      const result = await repository.update('1', updates);

      expect(mockDb.update).toHaveBeenCalledWith(mockTable);
      expect(result).toEqual(mockResult[0]);
    });
  });

  describe('delete', () => {
    it('should delete entity', async () => {
      const mockWhere = {
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.delete = vi.fn().mockReturnValue(mockWhere);

      await repository.delete('1');

      expect(mockDb.delete).toHaveBeenCalledWith(mockTable);
    });
  });

  describe('count', () => {
    it('should count all entities', async () => {
      const mockCountResult = [{ count: 5 }];
      const mockQuery = {
        from: vi.fn().mockResolvedValue(mockCountResult),
      };
      mockDb.select = vi.fn().mockReturnValue(mockQuery);

      const result = await repository.count();

      expect(result).toBe(5);
    });

    it('should count with where clause', async () => {
      const mockCountResult = [{ count: 3 }];
      const mockWhere = {
        where: vi.fn().mockResolvedValue(mockCountResult),
      };
      const mockQuery = {
        from: vi.fn().mockReturnValue(mockWhere),
      };
      mockDb.select = vi.fn().mockReturnValue(mockQuery);

      const whereClause = eq(mockTable.name, 'Test');
      const result = await repository.count(whereClause);

      expect(result).toBe(3);
    });
  });

  describe('exists', () => {
    it('should return true if entity exists', async () => {
      const mockResult = [{ id: '1' }];
      
      // Mock the query chain properly (same as findById)
      const mockLimit = {
        then: (resolve: any) => resolve(mockResult),
      };
      const mockWhere = {
        limit: vi.fn().mockReturnValue(mockLimit),
      };
      const mockFrom = {
        where: vi.fn().mockReturnValue(mockWhere),
      };
      const mockSelect = {
        from: vi.fn().mockReturnValue(mockFrom),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.exists('1');

      expect(result).toBe(true);
    });

    it('should return false if entity does not exist', async () => {
      // Mock the query chain properly (same as findById)
      const mockLimit = {
        then: (resolve: any) => resolve([]),
      };
      const mockWhere = {
        limit: vi.fn().mockReturnValue(mockLimit),
      };
      const mockFrom = {
        where: vi.fn().mockReturnValue(mockWhere),
      };
      const mockSelect = {
        from: vi.fn().mockReturnValue(mockFrom),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockSelect);

      const result = await repository.exists('non-existent');

      expect(result).toBe(false);
    });
  });
});



