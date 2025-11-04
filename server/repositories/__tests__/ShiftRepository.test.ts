/**
 * Unit tests for ShiftRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShiftRepository } from '../ShiftRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../shared/schema.js';

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

describe('ShiftRepository', () => {
  let repository: ShiftRepository;
  let mockDb: PostgresJsDatabase<typeof schema>;

  const mockShift = {
    id: 'shift-1',
    employee_id: 'emp-1',
    planned_start_at: new Date('2025-01-15T09:00:00'),
    planned_end_at: new Date('2025-01-15T17:00:00'),
    actual_start_at: null,
    actual_end_at: null,
    status: 'active' as const,
    created_at: new Date(),
  };

  const mockEmployee = {
    id: 'emp-1',
    company_id: 'comp-1',
    full_name: 'John Doe',
    position: 'Developer',
    telegram_user_id: null,
    status: 'active',
    tz: null,
    avatar_id: null,
    photo_url: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock table with _ property for BaseRepository.trackQuery
    const mockTable = {
      _: {
        name: 'shift',
      },
    };

    const mockQueryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockShift]),
      orderBy: vi.fn().mockReturnThis(),
    };

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
        innerJoin: vi.fn().mockReturnThis(),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockShift]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockShift]),
          }),
        }),
      }),
    } as any;

    repository = new ShiftRepository(mockDb);
    // Inject mock table into repository instance
    (repository as any).table = mockTable;
  });

  describe('findByEmployeeId', () => {
    it('should find shifts by employee ID', async () => {
      const result = await repository.findByEmployeeId('emp-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([mockShift]);
    });

    it('should respect limit parameter', async () => {
      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockShift]),
        orderBy: vi.fn().mockReturnThis(),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      await repository.findByEmployeeId('emp-1', 5);

      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array if no shifts found', async () => {
      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnThis(),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findByEmployeeId('emp-1');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByCompanyId', () => {
    it('should find active shifts for company', async () => {
      const mockShiftWithEmployee = {
        ...mockShift,
        employee: {
          id: mockEmployee.id,
          full_name: mockEmployee.full_name,
          position: mockEmployee.position,
          photo_url: mockEmployee.photo_url,
          avatar_id: mockEmployee.avatar_id,
        },
      };

      const mockWhereChain = {
        where: vi.fn().mockResolvedValue([mockShiftWithEmployee]),
      };
      const mockInnerJoinChain = {
        innerJoin: vi.fn().mockReturnValue(mockWhereChain),
      };
      const mockFromChain = {
        from: vi.fn().mockReturnValue(mockInnerJoinChain),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockFromChain);

      const result = await repository.findActiveByCompanyId('comp-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([mockShiftWithEmployee]);
    });

    it('should return empty array if no active shifts found', async () => {
      const mockWhereChain = {
        where: vi.fn().mockResolvedValue([]),
      };
      const mockInnerJoinChain = {
        innerJoin: vi.fn().mockReturnValue(mockWhereChain),
      };
      const mockFromChain = {
        from: vi.fn().mockReturnValue(mockInnerJoinChain),
      };
      
      mockDb.select = vi.fn().mockReturnValue(mockFromChain);

      const result = await repository.findActiveByCompanyId('comp-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });

  describe('findWorkIntervalsByShiftId', () => {
    it('should find work intervals for shift', async () => {
      const mockWorkInterval = {
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-01-15T09:00:00'),
        end_at: null,
        source: 'bot',
      };

      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockWorkInterval]),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findWorkIntervalsByShiftId('shift-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([mockWorkInterval]);
    });
  });

  describe('findBreakIntervalsByShiftId', () => {
    it('should find break intervals for shift', async () => {
      const mockBreakInterval = {
        id: 'bi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-01-15T12:00:00'),
        end_at: new Date('2025-01-15T13:00:00'),
        type: 'lunch' as const,
        source: 'bot',
      };

      const mockQueryChain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockBreakInterval]),
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockQueryChain),
      });

      const result = await repository.findBreakIntervalsByShiftId('shift-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([mockBreakInterval]);
    });
  });

  describe('create', () => {
    it('should create new shift', async () => {
      const newShift = {
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-01-16T09:00:00'),
        planned_end_at: new Date('2025-01-16T17:00:00'),
        status: 'planned' as const,
      };

      const result = await repository.create(newShift);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(mockShift);
    });
  });

  describe('update', () => {
    it('should update shift', async () => {
      const updatedData = {
        actual_start_at: new Date('2025-01-15T09:05:00'),
        status: 'active' as const,
      };

      const result = await repository.update('shift-1', updatedData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual(mockShift);
    });
  });
});
