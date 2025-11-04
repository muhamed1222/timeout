/**
 * Unit tests for CompanyService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE importing anything that uses them
vi.mock('../../lib/utils/cache.js', () => ({
  invalidateCompanyStats: vi.fn(),
  getOrSet: vi.fn(),
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

import { CompanyService } from '../../../server/CompanyService.js';
import type { DIContainer } from '../../../server/../lib/di/container.js';
import type { Company, InsertCompany } from '../../../server/../../shared/schema.js';
import * as cacheUtils from '../../../server/../lib/utils/cache.js';

describe('CompanyService', () => {
  let service: CompanyService;
  let mockContainer: DIContainer;
  let mockRepositories: any;

  const mockCompany: Company = {
    id: 'company-1',
    name: 'Test Company',
    timezone: 'Europe/Amsterdam',
    locale: 'ru',
    privacy_settings: {},
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock repositories
    mockRepositories = {
      company: {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findByCompanyId: vi.fn(),
      },
      employee: {
        findByCompanyId: vi.fn(),
      },
      shift: {
        findActiveByCompanyId: vi.fn(),
        findByEmployeeId: vi.fn(),
        findByEmployeeIds: vi.fn(),
        createMany: vi.fn(),
      },
      exception: {
        findByCompanyId: vi.fn(),
      },
      schedule: {
        findByCompanyId: vi.fn(),
      },
    };

    // Setup mock container
    mockContainer = {
      repositories: mockRepositories,
    } as DIContainer;

    service = new CompanyService(mockContainer);
  });

  describe('createCompany', () => {
    it('should create a company and invalidate cache', async () => {
      const insertData: InsertCompany = {
        name: 'New Company',
        timezone: 'Europe/Amsterdam',
        locale: 'ru',
      };

      mockRepositories.company.create.mockResolvedValue(mockCompany);
      vi.mocked(cacheUtils.invalidateCompanyStats).mockResolvedValue(undefined);

      const result = await service.createCompany(insertData);

      expect(result).toEqual(mockCompany);
      expect(mockRepositories.company.create).toHaveBeenCalledWith(insertData);
      expect(cacheUtils.invalidateCompanyStats).toHaveBeenCalledWith('company-1');
    });

    it('should throw error if creation fails', async () => {
      const insertData: InsertCompany = {
        name: 'New Company',
        timezone: 'Europe/Amsterdam',
        locale: 'ru',
      };

      const error = new Error('Database error');
      mockRepositories.company.create.mockRejectedValue(error);

      await expect(service.createCompany(insertData)).rejects.toThrow('Database error');
    });
  });

  describe('getCompany', () => {
    it('should return company by ID', async () => {
      mockRepositories.company.findById.mockResolvedValue(mockCompany);

      const result = await service.getCompany('company-1');

      expect(result).toEqual(mockCompany);
      expect(mockRepositories.company.findById).toHaveBeenCalledWith('company-1');
    });

    it('should return null if company not found', async () => {
      mockRepositories.company.findById.mockResolvedValue(undefined);

      const result = await service.getCompany('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error if query fails', async () => {
      const error = new Error('Database error');
      mockRepositories.company.findById.mockRejectedValue(error);

      await expect(service.getCompany('company-1')).rejects.toThrow('Database error');
    });
  });

  describe('updateCompany', () => {
    it('should update company and invalidate cache', async () => {
      const updateData: Partial<InsertCompany> = {
        name: 'Updated Name',
      };

      mockRepositories.company.update.mockResolvedValue({ ...mockCompany, name: 'Updated Name' });
      vi.mocked(cacheUtils.invalidateCompanyStats).mockResolvedValue(undefined);

      const result = await service.updateCompany('company-1', updateData);

      expect(result?.name).toBe('Updated Name');
      expect(mockRepositories.company.update).toHaveBeenCalledWith('company-1', updateData);
      expect(cacheUtils.invalidateCompanyStats).toHaveBeenCalledWith('company-1');
    });

    it('should throw error if update fails', async () => {
      const updateData: Partial<InsertCompany> = { name: 'Updated' };
      const error = new Error('Database error');
      mockRepositories.company.update.mockRejectedValue(error);

      await expect(service.updateCompany('company-1', updateData)).rejects.toThrow('Database error');
    });
  });

  describe('getCompanyStats', () => {
    it('should return company statistics from cache if available', async () => {
      const cachedStats = {
        totalEmployees: 10,
        activeShifts: 5,
        completedShifts: 3,
        exceptions: 2,
      };

      vi.mocked(cacheUtils.getOrSet).mockResolvedValue(cachedStats);

      const result = await service.getCompanyStats('company-1');

      expect(result).toEqual(cachedStats);
      expect(cacheUtils.getOrSet).toHaveBeenCalled();
    });

    it('should calculate stats if not cached', async () => {
      const employees = [{ id: 'emp-1' }, { id: 'emp-2' }];
      const activeShifts = [
        { id: 'shift-1', planned_start_at: new Date(), status: 'active' },
        { id: 'shift-2', planned_start_at: new Date(), status: 'active' },
      ];
      const exceptions = [{ id: 'exc-1' }];

      mockRepositories.employee.findByCompanyId.mockResolvedValue(employees);
      mockRepositories.shift.findActiveByCompanyId.mockResolvedValue(activeShifts);
      mockRepositories.exception.findByCompanyId.mockResolvedValue(exceptions);

      vi.mocked(cacheUtils.getOrSet).mockImplementation(async (key, fetcher) => {
        return await fetcher();
      });

      const result = await service.getCompanyStats('company-1');

      expect(result.totalEmployees).toBe(2);
      expect(result.activeShifts).toBe(2);
      expect(result.exceptions).toBe(1);
    });
  });

  describe('generateShifts', () => {
    it('should generate shifts for employees', async () => {
      const template = {
        id: 'template-1',
        company_id: 'company-1',
        rules: {
          workdays: [1, 2, 3, 4, 5], // Monday to Friday
          shift_start: '09:00',
          shift_end: '18:00',
        },
      };

      const employees = [
        { id: 'emp-1', company_id: 'company-1' },
        { id: 'emp-2', company_id: 'company-1' },
      ];

      mockRepositories.schedule.findByCompanyId.mockResolvedValue([template]);
      mockRepositories.employee.findByCompanyId.mockResolvedValue(employees);
      mockRepositories.shift.findByEmployeeIds.mockResolvedValue([]);
      mockRepositories.shift.createMany.mockResolvedValue([
        { id: 'shift-1', employee_id: 'emp-1' },
        { id: 'shift-2', employee_id: 'emp-2' },
      ]);
      vi.mocked(cacheUtils.invalidateCompanyStats).mockResolvedValue(undefined);

      const startDate = '2025-01-01';
      const endDate = '2025-01-05';

      const result = await service.generateShifts('company-1', startDate, endDate);

      expect(result.length).toBeGreaterThan(0);
      expect(mockRepositories.shift.createMany).toHaveBeenCalled();
      expect(cacheUtils.invalidateCompanyStats).toHaveBeenCalledWith('company-1');
    });

    it('should throw error if no templates found', async () => {
      mockRepositories.schedule.findByCompanyId.mockResolvedValue([]);

      await expect(
        service.generateShifts('company-1', '2025-01-01', '2025-01-05')
      ).rejects.toThrow('No schedule templates found for company');
    });

    it('should throw error if no employees found', async () => {
      const template = { id: 'template-1', company_id: 'company-1', rules: {} };
      mockRepositories.schedule.findByCompanyId.mockResolvedValue([template]);
      mockRepositories.employee.findByCompanyId.mockResolvedValue([]);

      await expect(
        service.generateShifts('company-1', '2025-01-01', '2025-01-05')
      ).rejects.toThrow('No employees found');
    });
  });
});

