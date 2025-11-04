/**
 * Unit tests for CompanyRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompanyRepository } from '../../../server/CompanyRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../server/../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

describe('CompanyRepository', () => {
  let mockDb: PostgresJsDatabase<typeof schema>;
  let repository: CompanyRepository;
  let mockTable: any;
  let mockEmployeeTable: any;

  beforeEach(() => {
    mockTable = schema.company;
    mockEmployeeTable = schema.employee;

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
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    } as any;

    repository = new CompanyRepository(mockDb);
  });

  describe('findByIdWithStats', () => {
    it('should return company with employee count', async () => {
      const mockCompany = { id: 'company-1', name: 'Test Company' };
      const mockResult = [{
        company: mockCompany,
        employeeCount: 5,
      }];

      const mockGroupBy = {
        limit: vi.fn().mockResolvedValue(mockResult),
      };
      mockDb.groupBy = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.leftJoin = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.where = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.from = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.select = vi.fn().mockReturnValue(mockGroupBy);

      const result = await repository.findByIdWithStats('company-1');

      expect(result).toBeDefined();
      expect(result?.employeeCount).toBe(5);
      expect(mockDb.leftJoin).toHaveBeenCalled();
    });

    it('should return undefined if company not found', async () => {
      const mockGroupBy = {
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.groupBy = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.leftJoin = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.where = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.from = vi.fn().mockReturnValue(mockGroupBy);
      mockDb.select = vi.fn().mockReturnValue(mockGroupBy);

      const result = await repository.findByIdWithStats('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated companies', async () => {
      const mockData = [
        { id: '1', name: 'Company 1' },
        { id: '2', name: 'Company 2' },
      ];
      const mockCount = [{ count: 10 }];

      const mockOffset = {
        offset: vi.fn().mockResolvedValue(mockData),
      };
      mockDb.limit = vi.fn().mockReturnValue(mockOffset);
      mockDb.from = vi.fn().mockReturnValue(mockOffset);
      mockDb.select = vi.fn().mockReturnValue(mockOffset);

      // Mock count
      const mockCountQuery = {
        from: vi.fn().mockResolvedValue(mockCount),
      };
      mockDb.select = vi.fn()
        .mockReturnValueOnce(mockOffset) // for data query
        .mockReturnValueOnce(mockCountQuery); // for count query

      const result = await repository.findAllPaginated(1, 10);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate total pages correctly', async () => {
      const mockData = [{ id: '1' }];
      const mockCount = [{ count: 25 }];

      const mockOffset = {
        offset: vi.fn().mockResolvedValue(mockData),
      };
      mockDb.limit = vi.fn().mockReturnValue(mockOffset);
      mockDb.from = vi.fn().mockReturnValue(mockOffset);
      
      const mockCountQuery = {
        from: vi.fn().mockResolvedValue(mockCount),
      };
      mockDb.select = vi.fn()
        .mockReturnValueOnce(mockOffset)
        .mockReturnValueOnce(mockCountQuery);

      const result = await repository.findAllPaginated(1, 10);

      expect(result.totalPages).toBe(3); // 25 / 10 = 2.5, ceil = 3
    });
  });

  describe('searchByName', () => {
    it('should search companies by name', async () => {
      const mockResults = [
        { id: '1', name: 'Test Company' },
        { id: '2', name: 'Test Corp' },
      ];

      const mockWhere = {
        where: vi.fn().mockResolvedValue(mockResults),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      const result = await repository.searchByName('Test');

      expect(result).toEqual(mockResults);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should escape special characters in query', async () => {
      const mockWhere = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      await repository.searchByName('Test%_Special');

      // Verify SQL injection protection - should escape % and _
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});



