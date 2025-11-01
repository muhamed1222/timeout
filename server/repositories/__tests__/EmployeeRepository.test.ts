/**
 * Unit tests for EmployeeRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeRepository } from '../EmployeeRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';

describe('EmployeeRepository', () => {
  let mockDb: PostgresJsDatabase<typeof schema>;
  let repository: EmployeeRepository;

  beforeEach(() => {
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
      and: vi.fn(),
      or: vi.fn(),
    } as any;

    repository = new EmployeeRepository(mockDb);
  });

  describe('findByCompanyId', () => {
    it('should return employees for company', async () => {
      const mockEmployees = [
        { id: 'emp-1', company_id: 'company-1', full_name: 'Employee 1' },
        { id: 'emp-2', company_id: 'company-1', full_name: 'Employee 2' },
      ];

      const mockWhere = {
        where: vi.fn().mockResolvedValue(mockEmployees),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      const result = await repository.findByCompanyId('company-1');

      expect(result).toEqual(mockEmployees);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return empty array if no employees', async () => {
      const mockWhere = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      const result = await repository.findByCompanyId('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('findByTelegramId', () => {
    it('should return employee by Telegram ID', async () => {
      const mockEmployee = {
        id: 'emp-1',
        telegram_user_id: '123456789',
        full_name: 'Test Employee',
      };

      const mockWhere = {
        where: vi.fn().mockResolvedValue([mockEmployee]),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      const result = await repository.findByTelegramId('123456789');

      expect(result).toEqual(mockEmployee);
    });

    it('should return undefined if not found', async () => {
      const mockWhere = {
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.from = vi.fn().mockReturnValue(mockWhere);
      mockDb.select = vi.fn().mockReturnValue(mockWhere);

      const result = await repository.findByTelegramId('non-existent');

      expect(result).toBeUndefined();
    });
  });
});

