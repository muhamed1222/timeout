/**
 * Unit tests for EmployeeRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeRepository } from '../../../server/EmployeeRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../server/../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('../../lib/metrics.js', () => ({
  databaseQueryDuration: {
    labels: vi.fn().mockReturnThis(),
    observe: vi.fn(),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let mockDb: PostgresJsDatabase<typeof schema>;

  const mockEmployee = {
    id: 'emp-1',
    company_id: 'comp-1',
    full_name: 'John Doe',
    position: 'Developer',
    telegram_user_id: '123456',
    status: 'active',
    tz: 'UTC',
    avatar_id: null,
    photo_url: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock table with _ property for BaseRepository.trackQuery
    const mockTable = {
      _: {
        name: 'employee',
      },
    };

    // Mock database with query builder chain
    const mockQueryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockEmployee]),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    };

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockEmployee]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any;

    // Create repository with mocked table
    repository = new EmployeeRepository(mockDb);
    // Inject mock table into repository instance
    (repository as any).table = mockTable;
  });

  describe('findById', () => {
    it('should find employee by ID', async () => {
      const result = await repository.findById('emp-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it('should return undefined if employee not found', async () => {
      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeUndefined();
    });

    it('should handle missing avatar fields gracefully', async () => {
      const employeeWithoutAvatar = {
        ...mockEmployee,
        avatar_id: undefined,
        photo_url: undefined,
      };

      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([employeeWithoutAvatar]),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findById('emp-1');

      expect(result?.avatar_id).toBeNull();
      expect(result?.photo_url).toBeNull();
    });
  });

  describe('findByTelegramId', () => {
    it('should find employee by Telegram user ID', async () => {
      const result = await repository.findByTelegramId('123456');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it('should return undefined if employee not found', async () => {
      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findByTelegramId('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findByCompanyId', () => {
    it('should find employees by company ID', async () => {
      const mockWhereChain = {
        where: vi.fn().mockResolvedValue([mockEmployee]),
      };
      const mockFromChain = {
        from: vi.fn().mockReturnValue(mockWhereChain),
      };
      mockDb.select = vi.fn().mockReturnValue(mockFromChain);

      const result = await repository.findByCompanyId('comp-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([mockEmployee]);
    });

    it('should return empty array if no employees found', async () => {
      const mockWhereChain = {
        where: vi.fn().mockResolvedValue([]),
      };
      const mockFromChain = {
        from: vi.fn().mockReturnValue(mockWhereChain),
      };
      mockDb.select = vi.fn().mockReturnValue(mockFromChain);

      const result = await repository.findByCompanyId('non-existent');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('should filter by status if provided', async () => {
      const mockWhereChain = {
        where: vi.fn().mockResolvedValue([mockEmployee]),
      };
      const mockFromChain = {
        from: vi.fn().mockReturnValue(mockWhereChain),
      };
      mockDb.select = vi.fn().mockReturnValue(mockFromChain);

      const result = await repository.findByCompanyId('comp-1', 'active');

      expect(mockDb.select).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([mockEmployee]);
    });
  });

  describe('create', () => {
    it('should create new employee', async () => {
      const newEmployee = {
        company_id: 'comp-1',
        full_name: 'Jane Doe',
        position: 'Manager',
        telegram_user_id: null,
        status: 'active' as const,
        tz: null,
      };

      const result = await repository.create(newEmployee);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update employee', async () => {
      const updatedData = {
        position: 'Senior Developer',
      };

      const result = await repository.update('emp-1', updatedData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('delete', () => {
    it('should delete employee', async () => {
      await repository.delete('emp-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
