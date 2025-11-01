/**
 * Unit tests for ShiftService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE importing anything that uses them
vi.mock('../../lib/utils/cache.js', () => ({
  invalidateCompanyStatsByShift: vi.fn(),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock repositories to avoid DB connection
vi.mock('../../repositories/index.js', () => ({
  repositories: {},
}));

// Mock DI container
vi.mock('../../lib/di/container.js', () => ({
  getContainer: vi.fn(() => ({
    repositories: {},
  })),
  createContainer: vi.fn(),
}));

import { ShiftService } from '../ShiftService.js';
import type { DIContainer } from '../../lib/di/container.js';
import type { Shift, InsertShift } from '../../../shared/schema.js';
import * as cacheUtils from '../../lib/utils/cache.js';

describe('ShiftService', () => {
  let service: ShiftService;
  let mockContainer: DIContainer;
  let mockRepositories: any;

  const mockShift: Shift = {
    id: 'shift-1',
    employee_id: 'emp-1',
    planned_start_at: new Date('2025-01-01T09:00:00'),
    planned_end_at: new Date('2025-01-01T18:00:00'),
    actual_start_at: null,
    actual_end_at: null,
    status: 'planned',
    created_at: new Date(),
  };

  const mockEmployee = {
    id: 'emp-1',
    company_id: 'company-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepositories = {
      shift: {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findActiveByCompanyId: vi.fn(),
        createWorkInterval: vi.fn(),
        updateWorkInterval: vi.fn(),
        findWorkIntervalsByShiftId: vi.fn(),
        createBreakInterval: vi.fn(),
        updateBreakInterval: vi.fn(),
        findBreakIntervalsByShiftId: vi.fn(),
      },
      employee: {
        findById: vi.fn(),
      },
    };

    mockContainer = {
      repositories: mockRepositories,
    } as DIContainer;

    service = new ShiftService(mockContainer);
  });

  describe('createShift', () => {
    it('should create shift and invalidate cache', async () => {
      const insertData: InsertShift = {
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-01-01T09:00:00'),
        planned_end_at: new Date('2025-01-01T18:00:00'),
        status: 'planned',
      };

      mockRepositories.shift.create.mockResolvedValue(mockShift);
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      vi.mocked(cacheUtils.invalidateCompanyStatsByShift).mockResolvedValue(undefined);

      const result = await service.createShift(insertData);

      expect(result).toEqual(mockShift);
      expect(cacheUtils.invalidateCompanyStatsByShift).toHaveBeenCalledWith({ employee_id: 'emp-1' });
    });
  });

  describe('getShift', () => {
    it('should return shift by ID', async () => {
      mockRepositories.shift.findById.mockResolvedValue(mockShift);

      const result = await service.getShift('shift-1');

      expect(result).toEqual(mockShift);
    });

    it('should return null if not found', async () => {
      mockRepositories.shift.findById.mockResolvedValue(undefined);

      const result = await service.getShift('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('startShift', () => {
    it('should start shift and invalidate cache', async () => {
      const updatedShift = { ...mockShift, status: 'active', actual_start_at: new Date() };
      mockRepositories.shift.update.mockResolvedValue(updatedShift);
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      vi.mocked(cacheUtils.invalidateCompanyStatsByShift).mockResolvedValue(undefined);

      const result = await service.startShift('shift-1');

      expect(result?.status).toBe('active');
      expect(result?.actual_start_at).toBeDefined();
      expect(cacheUtils.invalidateCompanyStatsByShift).toHaveBeenCalled();
    });

    it('should throw if shift not found', async () => {
      mockRepositories.shift.update.mockResolvedValue(undefined);

      await expect(service.startShift('non-existent')).rejects.toThrow('Shift not found');
    });
  });

  describe('endShift', () => {
    it('should end shift and invalidate cache', async () => {
      const updatedShift = { ...mockShift, status: 'completed', actual_end_at: new Date() };
      mockRepositories.shift.update.mockResolvedValue(updatedShift);
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      vi.mocked(cacheUtils.invalidateCompanyStatsByShift).mockResolvedValue(undefined);

      const result = await service.endShift('shift-1');

      expect(result?.status).toBe('completed');
      expect(result?.actual_end_at).toBeDefined();
    });
  });

  describe('startWorkInterval', () => {
    it('should create work interval', async () => {
      const interval = { id: 'wi-1', shift_id: 'shift-1', start_at: new Date() };
      mockRepositories.shift.createWorkInterval.mockResolvedValue(interval);

      const result = await service.startWorkInterval('shift-1');

      expect(result).toEqual(interval);
      expect(mockRepositories.shift.createWorkInterval).toHaveBeenCalled();
    });
  });

  describe('endWorkInterval', () => {
    it('should update work interval end time', async () => {
      const interval = { id: 'wi-1', end_at: new Date() };
      mockRepositories.shift.updateWorkInterval.mockResolvedValue(interval);

      const result = await service.endWorkInterval('wi-1');

      expect(result).toEqual(interval);
    });
  });

  describe('startBreak', () => {
    it('should create break interval', async () => {
      const interval = { id: 'bi-1', shift_id: 'shift-1', type: 'lunch', start_at: new Date() };
      mockRepositories.shift.createBreakInterval.mockResolvedValue(interval);

      const result = await service.startBreak('shift-1', 'lunch');

      expect(result).toEqual(interval);
      expect(mockRepositories.shift.createBreakInterval).toHaveBeenCalled();
    });
  });

  describe('getActiveShiftsByCompany', () => {
    it('should return active shifts for company', async () => {
      const shifts = [mockShift];
      mockRepositories.shift.findActiveByCompanyId.mockResolvedValue(shifts);

      const result = await service.getActiveShiftsByCompany('company-1');

      expect(result).toEqual(shifts);
    });
  });

  describe('calculateWorkTime', () => {
    it('should calculate work time excluding breaks', async () => {
      const workIntervals = [
        {
          id: 'wi-1',
          start_at: new Date('2025-01-01T09:00:00'),
          end_at: new Date('2025-01-01T13:00:00'), // 4 hours
        },
        {
          id: 'wi-2',
          start_at: new Date('2025-01-01T14:00:00'),
          end_at: new Date('2025-01-01T18:00:00'), // 4 hours
        },
      ];

      const breakIntervals = [
        {
          id: 'bi-1',
          start_at: new Date('2025-01-01T13:00:00'),
          end_at: new Date('2025-01-01T14:00:00'), // 1 hour
        },
      ];

      mockRepositories.shift.findWorkIntervalsByShiftId.mockResolvedValue(workIntervals);
      mockRepositories.shift.findBreakIntervalsByShiftId.mockResolvedValue(breakIntervals);

      const result = await service.calculateWorkTime('shift-1');

      // 8 hours work - 1 hour break = 7 hours = 420 minutes
      expect(result).toBeCloseTo(420, 0);
    });

    it('should return 0 if no work intervals', async () => {
      mockRepositories.shift.findWorkIntervalsByShiftId.mockResolvedValue([]);
      mockRepositories.shift.findBreakIntervalsByShiftId.mockResolvedValue([]);

      const result = await service.calculateWorkTime('shift-1');

      expect(result).toBe(0);
    });
  });
});

