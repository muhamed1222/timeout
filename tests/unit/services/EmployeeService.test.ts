/**
 * Unit tests for EmployeeService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE importing anything that uses them
vi.mock('../../lib/utils/cache.js', () => ({
  invalidateCompanyStatsByEmployeeId: vi.fn(),
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

import { EmployeeService } from '../../../server/EmployeeService.js';
import type { DIContainer } from '../../../server/../lib/di/container.js';
import type { Employee, InsertEmployee } from '../../../server/../../shared/schema.js';
import * as cacheUtils from '../../../server/../lib/utils/cache.js';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockContainer: DIContainer;
  let mockRepositories: any;

  const mockEmployee: Employee = {
    id: 'emp-1',
    company_id: 'company-1',
    full_name: 'Test Employee',
    position: 'Developer',
    telegram_user_id: '123456789',
    status: 'active',
    tz: 'Europe/Amsterdam',
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepositories = {
      employee: {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findByTelegramId: vi.fn(),
        findByCompanyId: vi.fn(),
      },
      shift: {
        findByEmployeeId: vi.fn(),
      },
    };

    mockContainer = {
      repositories: mockRepositories,
    } as DIContainer;

    service = new EmployeeService(mockContainer);
  });

  describe('createEmployee', () => {
    it('should create employee and invalidate cache', async () => {
      const insertData: InsertEmployee = {
        company_id: 'company-1',
        full_name: 'New Employee',
        status: 'active',
      };

      mockRepositories.employee.create.mockResolvedValue(mockEmployee);
      vi.mocked(cacheUtils.invalidateCompanyStatsByEmployeeId).mockResolvedValue(undefined);

      const result = await service.createEmployee(insertData);

      expect(result).toEqual(mockEmployee);
      expect(mockRepositories.employee.create).toHaveBeenCalledWith(insertData);
      expect(cacheUtils.invalidateCompanyStatsByEmployeeId).toHaveBeenCalledWith('emp-1');
    });
  });

  describe('getEmployee', () => {
    it('should return employee by ID', async () => {
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployee('emp-1');

      expect(result).toEqual(mockEmployee);
    });

    it('should return null if not found', async () => {
      mockRepositories.employee.findById.mockResolvedValue(undefined);

      const result = await service.getEmployee('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getEmployeeByTelegramId', () => {
    it('should return employee by Telegram ID', async () => {
      mockRepositories.employee.findByTelegramId.mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeByTelegramId('123456789');

      expect(result).toEqual(mockEmployee);
      expect(mockRepositories.employee.findByTelegramId).toHaveBeenCalledWith('123456789');
    });

    it('should return null if not found', async () => {
      mockRepositories.employee.findByTelegramId.mockResolvedValue(undefined);

      const result = await service.getEmployeeByTelegramId('999');

      expect(result).toBeNull();
    });
  });

  describe('updateEmployee', () => {
    it('should update employee and invalidate cache', async () => {
      const updateData = { full_name: 'Updated Name' };
      const updatedEmployee = { ...mockEmployee, full_name: 'Updated Name' };

      mockRepositories.employee.update.mockResolvedValue(updatedEmployee);
      vi.mocked(cacheUtils.invalidateCompanyStatsByEmployeeId).mockResolvedValue(undefined);

      const result = await service.updateEmployee('emp-1', updateData);

      expect(result?.full_name).toBe('Updated Name');
      expect(cacheUtils.invalidateCompanyStatsByEmployeeId).toHaveBeenCalledWith('emp-1');
    });
  });

  describe('deactivateEmployee', () => {
    it('should deactivate employee and invalidate cache', async () => {
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.employee.update.mockResolvedValue({ ...mockEmployee, status: 'inactive' });
      vi.mocked(cacheUtils.invalidateCompanyStatsByEmployeeId).mockResolvedValue(undefined);

      const result = await service.deactivateEmployee('emp-1');

      expect(result).toBe(true);
      expect(mockRepositories.employee.update).toHaveBeenCalledWith('emp-1', { status: 'inactive' });
      expect(cacheUtils.invalidateCompanyStatsByEmployeeId).toHaveBeenCalledWith('emp-1');
    });

    it('should throw if employee not found', async () => {
      mockRepositories.employee.findById.mockResolvedValue(undefined);

      await expect(service.deactivateEmployee('non-existent')).rejects.toThrow('Employee not found');
    });
  });

  describe('getEmployeesByCompany', () => {
    it('should return employees for company', async () => {
      const employees = [mockEmployee];
      mockRepositories.employee.findByCompanyId.mockResolvedValue(employees);

      const result = await service.getEmployeesByCompany('company-1');

      expect(result).toEqual(employees);
      expect(mockRepositories.employee.findByCompanyId).toHaveBeenCalledWith('company-1');
    });
  });

  describe('linkTelegramAccount', () => {
    it('should link Telegram account to employee', async () => {
      const updated = { ...mockEmployee, telegram_user_id: '999888777' };
      mockRepositories.employee.update.mockResolvedValue(updated);

      const result = await service.linkTelegramAccount('emp-1', '999888777');

      expect(result?.telegram_user_id).toBe('999888777');
      expect(mockRepositories.employee.update).toHaveBeenCalledWith('emp-1', {
        telegram_user_id: '999888777',
      });
    });
  });

  describe('unlinkTelegramAccount', () => {
    it('should unlink Telegram account from employee', async () => {
      const updated = { ...mockEmployee, telegram_user_id: null };
      mockRepositories.employee.update.mockResolvedValue(updated);

      const result = await service.unlinkTelegramAccount('emp-1');

      expect(result?.telegram_user_id).toBeNull();
    });
  });

  describe('getEmployeeShifts', () => {
    it('should return shifts for employee', async () => {
      const shifts = [{ id: 'shift-1', employee_id: 'emp-1' }];
      mockRepositories.shift.findByEmployeeId.mockResolvedValue(shifts);

      const result = await service.getEmployeeShifts('emp-1');

      expect(result).toEqual(shifts);
    });
  });

  describe('getActiveShift', () => {
    it('should return active shift if exists', async () => {
      const activeShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        status: 'active',
        planned_start_at: new Date(),
        planned_end_at: new Date(),
      };
      mockRepositories.shift.findByEmployeeId.mockResolvedValue([activeShift]);

      const result = await service.getActiveShift('emp-1');

      expect(result).toEqual(activeShift);
    });

    it('should return null if no active shift', async () => {
      const completedShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        status: 'completed',
        planned_start_at: new Date(),
        planned_end_at: new Date(),
      };
      mockRepositories.shift.findByEmployeeId.mockResolvedValue([completedShift]);

      const result = await service.getActiveShift('emp-1');

      expect(result).toBeNull();
    });
  });
});

