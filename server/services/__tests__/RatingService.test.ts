/**
 * Unit tests for RatingService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE importing anything that uses them
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

import { RatingService } from '../RatingService.js';
import type { DIContainer } from '../../lib/di/container.js';
import type { InsertViolations, InsertCompanyViolationRules } from '../../../shared/schema.js';

describe('RatingService', () => {
  let service: RatingService;
  let mockContainer: DIContainer;
  let mockRepositories: any;

  const mockEmployee = {
    id: 'emp-1',
    company_id: 'company-1',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepositories = {
      violation: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findByCompanyId: vi.fn(),
        createViolation: vi.fn(),
        findViolationsByEmployee: vi.fn(),
      },
      rating: {
        create: vi.fn(),
        update: vi.fn(),
        findByEmployeeAndPeriod: vi.fn(),
      },
      employee: {
        findById: vi.fn(),
        findByCompanyId: vi.fn(),
        update: vi.fn(),
      },
    };

    mockContainer = {
      repositories: mockRepositories,
    } as DIContainer;

    service = new RatingService(mockContainer);
  });

  describe('createViolationRule', () => {
    it('should create violation rule', async () => {
      const ruleData: InsertCompanyViolationRules = {
        company_id: 'company-1',
        code: 'LATE_START',
        name: 'Late Start',
        penalty_percent: '5',
        auto_detectable: false,
        is_active: true,
      };

      const createdRule = { id: 'rule-1', ...ruleData };
      mockRepositories.violation.findByCompanyId.mockResolvedValue([]);
      mockRepositories.violation.create.mockResolvedValue(createdRule);

      const result = await service.createViolationRule(ruleData);

      expect(result).toEqual(createdRule);
    });

    it('should throw if duplicate code exists', async () => {
      const ruleData: InsertCompanyViolationRules = {
        company_id: 'company-1',
        code: 'LATE_START',
        name: 'Late Start',
        penalty_percent: '5',
        auto_detectable: false,
        is_active: true,
      };

      const existingRule = { id: 'rule-1', code: 'LATE_START' };
      mockRepositories.violation.findByCompanyId.mockResolvedValue([existingRule]);

      await expect(service.createViolationRule(ruleData)).rejects.toThrow(
        "Violation rule with code 'LATE_START' already exists"
      );
    });
  });

  describe('getViolationRules', () => {
    it('should return violation rules for company', async () => {
      const rules = [{ id: 'rule-1', code: 'LATE_START' }];
      mockRepositories.violation.findByCompanyId.mockResolvedValue(rules);

      const result = await service.getViolationRules('company-1');

      expect(result).toEqual(rules);
    });
  });

  describe('createViolation', () => {
    it('should create violation and recalculate rating', async () => {
      const violationData: InsertViolations = {
        employee_id: 'emp-1',
        company_id: 'company-1',
        rule_id: 'rule-1',
        source: 'manual',
        penalty: '5',
      };

      const createdViolation = { id: 'violation-1', ...violationData };
      mockRepositories.violation.createViolation.mockResolvedValue(createdViolation);
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue([createdViolation]);
      mockRepositories.violation.findByCompanyId.mockResolvedValue([
        { id: 'rule-1', is_active: true, penalty_percent: '5' },
      ]);
      mockRepositories.rating.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockRepositories.rating.create.mockResolvedValue({ id: 'rating-1' });

      const result = await service.createViolation(violationData);

      expect(result).toEqual(createdViolation);
      expect(mockRepositories.rating.create).toHaveBeenCalled();
    });
  });

  describe('getViolationsByEmployee', () => {
    it('should return violations for employee', async () => {
      const violations = [
        { id: 'v1', employee_id: 'emp-1', created_at: new Date('2025-01-15') },
        { id: 'v2', employee_id: 'emp-1', created_at: new Date('2025-01-20') },
      ];
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue(violations);

      const result = await service.getViolationsByEmployee('emp-1');

      expect(result).toEqual(violations);
    });

    it('should filter violations by period', async () => {
      const violations = [
        { id: 'v1', employee_id: 'emp-1', created_at: new Date('2025-01-15') },
        { id: 'v2', employee_id: 'emp-1', created_at: new Date('2025-01-25') },
      ];
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue(violations);

      const result = await service.getViolationsByEmployee(
        'emp-1',
        '2025-01-01',
        '2025-01-20'
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('v1');
    });
  });

  describe('recalculateEmployeeRating', () => {
    it('should calculate rating from violations', async () => {
      const violations = [
        { id: 'v1', rule_id: 'rule-1', created_at: new Date() },
        { id: 'v2', rule_id: 'rule-2', created_at: new Date() },
      ];

      const rules = [
        { id: 'rule-1', penalty_percent: '10', is_active: true },
        { id: 'rule-2', penalty_percent: '5', is_active: true },
      ];

      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue(violations);
      mockRepositories.violation.findByCompanyId.mockResolvedValue(rules);
      mockRepositories.rating.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockRepositories.rating.create.mockResolvedValue({ id: 'rating-1' });

      const result = await service.recalculateEmployeeRating(
        'emp-1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.rating).toBe(85); // 100 - 10 - 5
      expect(result.violationsCount).toBe(2);
      expect(mockRepositories.rating.create).toHaveBeenCalled();
    });

    it('should update existing rating', async () => {
      const violations = [{ id: 'v1', rule_id: 'rule-1', created_at: new Date() }];
      const rules = [{ id: 'rule-1', penalty_percent: '5', is_active: true }];
      const existingRating = { id: 'rating-1', employee_id: 'emp-1', rating: '100' };

      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue(violations);
      mockRepositories.violation.findByCompanyId.mockResolvedValue(rules);
      mockRepositories.rating.findByEmployeeAndPeriod.mockResolvedValue(existingRating);
      mockRepositories.rating.update.mockResolvedValue({ ...existingRating, rating: '95' });

      const result = await service.recalculateEmployeeRating(
        'emp-1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.rating).toBe(95);
      expect(mockRepositories.rating.update).toHaveBeenCalled();
    });

    it('should terminate employee if rating <= 30', async () => {
      const violations = [{ id: 'v1', rule_id: 'rule-1', created_at: new Date() }];
      const rules = [{ id: 'rule-1', penalty_percent: '75', is_active: true }];

      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue(violations);
      mockRepositories.violation.findByCompanyId.mockResolvedValue(rules);
      mockRepositories.rating.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockRepositories.rating.create.mockResolvedValue({ id: 'rating-1' });
      mockRepositories.employee.update.mockResolvedValue({ ...mockEmployee, status: 'terminated' });

      const result = await service.recalculateEmployeeRating(
        'emp-1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.rating).toBe(25);
      expect(result.isBlocked).toBe(true);
      expect(mockRepositories.employee.update).toHaveBeenCalledWith('emp-1', {
        status: 'terminated',
      });
    });
  });

  describe('recalculateCompanyRatings', () => {
    it('should recalculate ratings for all employees', async () => {
      const employees = [
        { id: 'emp-1', company_id: 'company-1' },
        { id: 'emp-2', company_id: 'company-1' },
      ];

      mockRepositories.employee.findByCompanyId.mockResolvedValue(employees);
      mockRepositories.employee.findById.mockResolvedValue(mockEmployee);
      mockRepositories.violation.findViolationsByEmployee.mockResolvedValue([]);
      mockRepositories.violation.findByCompanyId.mockResolvedValue([]);
      mockRepositories.rating.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockRepositories.rating.create.mockResolvedValue({ id: 'rating-1' });

      const result = await service.recalculateCompanyRatings('company-1');

      expect(result.length).toBe(2);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[1].employeeId).toBe('emp-2');
    });
  });
});

