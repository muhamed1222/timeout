import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { shiftMonitor, type ShiftViolation } from '../shiftMonitor';
import { storage } from '../../storage';
import type { Shift, Employee } from '../../../shared/schema';

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getActiveShiftsByCompany: vi.fn(),
    getWorkIntervalsByShift: vi.fn(),
    getBreakIntervalsByShift: vi.fn(),
    getEmployee: vi.fn(),
    getExceptionsByCompany: vi.fn(),
    createException: vi.fn(),
    getViolationRulesByCompany: vi.fn(),
    createViolation: vi.fn(),
    updateEmployeeRatingFromViolations: vi.fn(),
    getAllCompanies: vi.fn(),
  },
}));

describe('ShiftMonitor', () => {
  const mockEmployee: Employee = {
    id: 'emp-1',
    company_id: 'comp-1',
    full_name: 'John Doe',
    position: 'Developer',
    telegram_user_id: null,
    status: 'active',
    tz: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkShiftViolations', () => {
    it('should detect late start violation (>15 min)', async () => {
      const now = new Date('2025-10-29T09:30:00');
      vi.setSystemTime(now);

      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: null,
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockWorkInterval = {
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T09:20:00'), // 20 minutes late
        end_at: null,
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([mockWorkInterval]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        type: 'late_start',
        employeeId: 'emp-1',
        shiftId: 'shift-1',
        severity: 1,
      });
      expect(violations[0].details.minutesLate).toBe(20);
    });

    it('should detect late start with higher severity (>30 min)', async () => {
      const now = new Date('2025-10-29T09:45:00');
      vi.setSystemTime(now);

      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: null,
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockWorkInterval = {
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T09:35:00'), // 35 minutes late
        end_at: null,
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([mockWorkInterval]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe(2); // Higher severity for >30 min
    });

    it('should detect missed shift (>60 min late)', async () => {
      const now = new Date('2025-10-29T10:30:00');
      vi.setSystemTime(now);

      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: null,
        actual_end_at: null,
        status: 'planned', // Never started
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        type: 'missed_shift',
        employeeId: 'emp-1',
        shiftId: 'shift-1',
        severity: 3, // Highest severity
      });
    });

    it('should detect early end violation', async () => {
      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: new Date('2025-10-29T16:30:00'),
        status: 'completed',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockWorkInterval = {
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T09:00:00'),
        end_at: new Date('2025-10-29T16:30:00'), // 30 minutes early
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([mockWorkInterval]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        type: 'early_end',
        employeeId: 'emp-1',
        severity: 1, // 30 min early (not > 30)
      });
      expect(violations[0].details.minutesEarly).toBe(30);
    });

    it('should detect long break violation (>90 min)', async () => {
      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockBreakInterval = {
        id: 'bi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T12:00:00'),
        end_at: new Date('2025-10-29T14:00:00'), // 2 hours = 120 minutes
        type: 'lunch',
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([mockBreakInterval]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        type: 'long_break',
        employeeId: 'emp-1',
        severity: 2,
      });
      expect(violations[0].details.duration).toBe(120);
    });

    it('should detect break without end (no_break_end)', async () => {
      const now = new Date('2025-10-29T14:00:00');
      vi.setSystemTime(now);

      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockBreakInterval = {
        id: 'bi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T12:00:00'),
        end_at: null, // Break not ended for 2 hours
        type: 'lunch',
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([mockBreakInterval]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        type: 'no_break_end',
        employeeId: 'emp-1',
        severity: 3, // High severity
      });
    });

    it('should not detect violations for on-time shifts', async () => {
      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: new Date('2025-10-29T09:00:00'),
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockWorkInterval = {
        id: 'wi-1',
        shift_id: 'shift-1',
        start_at: new Date('2025-10-29T09:00:00'), // On time
        end_at: null,
        source: 'bot',
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([mockWorkInterval]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(0);
    });

    it('should handle empty shifts list', async () => {
      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([]);

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getActiveShiftsByCompany).mockRejectedValue(
        new Error('Database error')
      );

      const violations = await shiftMonitor.checkShiftViolations('comp-1');

      expect(violations).toHaveLength(0);
    });
  });

  describe('createExceptionsFromViolations', () => {
    const mockViolation: ShiftViolation = {
      type: 'late_start',
      employeeId: 'emp-1',
      shiftId: 'shift-1',
      shiftDate: '2025-10-29',
      details: {
        planned: new Date('2025-10-29T09:00:00'),
        actual: new Date('2025-10-29T09:20:00'),
        minutesLate: 20,
        threshold: 15,
      },
      severity: 1,
    };

    const mockRule = {
      id: 'rule-1',
      company_id: 'comp-1',
      code: 'late',
      name: 'Late Start',
      penalty_percent: '5.00',
      auto_detectable: true,
      is_active: true,
      created_at: new Date(),
    };

    beforeEach(() => {
      vi.mocked(storage.getEmployee).mockResolvedValue(mockEmployee);
      vi.mocked(storage.getExceptionsByCompany).mockResolvedValue([]);
      vi.mocked(storage.getViolationRulesByCompany).mockResolvedValue([mockRule]);
      vi.mocked(storage.createViolation).mockResolvedValue({
        id: 'viol-1',
        employee_id: 'emp-1',
        company_id: 'comp-1',
        rule_id: 'rule-1',
        source: 'auto',
        reason: 'Auto-detected: late_start',
        penalty: '5.00',
        created_by: null,
        created_at: new Date(),
      });
      vi.mocked(storage.updateEmployeeRatingFromViolations).mockResolvedValue(undefined);
      vi.mocked(storage.createException).mockResolvedValue({
        id: 'exc-1',
        employee_id: 'emp-1',
        date: '2025-10-29',
        kind: 'late_start',
        severity: 1,
        details: {},
        resolved_at: null,
        violation_id: 'viol-1',
      });
    });

    it('should create violation, update rating, and create exception', async () => {
      await shiftMonitor.createExceptionsFromViolations([mockViolation]);

      // Verify violation created
      expect(storage.createViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          company_id: 'comp-1',
          rule_id: 'rule-1',
          source: 'auto',
          penalty: '5.00',
        })
      );

      // Verify rating updated
      expect(storage.updateEmployeeRatingFromViolations).toHaveBeenCalledWith(
        'emp-1',
        expect.any(Date),
        expect.any(Date)
      );

      // Verify exception created with violation link
      expect(storage.createException).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          date: '2025-10-29',
          kind: 'late_start',
          severity: 1,
          violation_id: 'viol-1',
        })
      );
    });

    it('should not create duplicate exceptions', async () => {
      // Mock existing exception
      vi.mocked(storage.getExceptionsByCompany).mockResolvedValue([
        {
          id: 'exc-existing',
          employee_id: 'emp-1',
          date: '2025-10-29',
          kind: 'late_start',
          severity: 1,
          details: {},
          resolved_at: null,
          violation_id: null,
        },
      ]);

      await shiftMonitor.createExceptionsFromViolations([mockViolation]);

      expect(storage.createViolation).not.toHaveBeenCalled();
      expect(storage.createException).not.toHaveBeenCalled();
    });

    it('should handle missing violation rules gracefully', async () => {
      vi.mocked(storage.getViolationRulesByCompany).mockResolvedValue([]);

      await shiftMonitor.createExceptionsFromViolations([mockViolation]);

      expect(storage.createException).not.toHaveBeenCalled();
    });

    it('should handle employee not found', async () => {
      vi.mocked(storage.getEmployee).mockResolvedValue(null);

      await shiftMonitor.createExceptionsFromViolations([mockViolation]);

      expect(storage.createViolation).not.toHaveBeenCalled();
      expect(storage.createException).not.toHaveBeenCalled();
    });

    it('should create exception even if violation creation fails', async () => {
      vi.mocked(storage.createViolation).mockRejectedValue(new Error('Failed to create violation'));

      await shiftMonitor.createExceptionsFromViolations([mockViolation]);

      // Should still create exception (without violation_id)
      expect(storage.createException).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          kind: 'late_start',
          violation_id: undefined,
        })
      );
    });
  });

  describe('processCompanyShifts', () => {
    it('should process shifts and return statistics', async () => {
      const mockShift = {
        id: 'shift-1',
        employee_id: 'emp-1',
        planned_start_at: new Date('2025-10-29T09:00:00'),
        planned_end_at: new Date('2025-10-29T17:00:00'),
        actual_start_at: null,
        actual_end_at: null,
        status: 'active',
        created_at: new Date(),
        employee: mockEmployee,
      } as Shift & { employee: Employee };

      const mockRule = {
        id: 'rule-1',
        company_id: 'comp-1',
        code: 'late',
        name: 'Late Start',
        penalty_percent: '5.00',
        auto_detectable: true,
        is_active: true,
        created_at: new Date(),
      };

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([mockShift]);
      vi.mocked(storage.getWorkIntervalsByShift).mockResolvedValue([
        {
          id: 'wi-1',
          shift_id: 'shift-1',
          start_at: new Date('2025-10-29T09:20:00'),
          end_at: null,
          source: 'bot',
        },
      ]);
      vi.mocked(storage.getBreakIntervalsByShift).mockResolvedValue([]);
      vi.mocked(storage.getEmployee).mockResolvedValue(mockEmployee);
      // getExceptionsByCompany is called 3 times: once to check duplicates, once for initial count, once for final count
      vi.mocked(storage.getExceptionsByCompany).mockResolvedValue([]); // For duplicate check and initial
      vi.mocked(storage.getViolationRulesByCompany).mockResolvedValue([mockRule]);
      vi.mocked(storage.createViolation).mockResolvedValue({
        id: 'viol-1',
        employee_id: 'emp-1',
        company_id: 'comp-1',
        rule_id: 'rule-1',
        source: 'auto',
        reason: 'Auto-detected: late_start',
        penalty: '5.00',
        created_by: null,
        created_at: new Date(),
      });
      vi.mocked(storage.updateEmployeeRatingFromViolations).mockResolvedValue(undefined);
      vi.mocked(storage.createException).mockResolvedValue({
        id: 'exc-1',
        employee_id: 'emp-1',
        date: '2025-10-29',
        kind: 'late_start',
        severity: 1,
        details: {},
        resolved_at: null,
        violation_id: 'viol-1',
      });

      const result = await shiftMonitor.processCompanyShifts('comp-1');

      expect(result.violationsFound).toBe(1);
      expect(result.exceptionsCreated).toBeGreaterThan(0); // Just check that exception was created
    });

    it('should handle errors and return zero counts', async () => {
      vi.mocked(storage.getActiveShiftsByCompany).mockRejectedValue(new Error('DB error'));

      const result = await shiftMonitor.processCompanyShifts('comp-1');

      expect(result).toEqual({
        violationsFound: 0,
        exceptionsCreated: 0,
      });
    });
  });

  describe('runGlobalMonitoring', () => {
    it('should process all companies', async () => {
      vi.mocked(storage.getAllCompanies).mockResolvedValue([
        { id: 'comp-1', name: 'Company 1', timezone: 'UTC', locale: 'en', privacy_settings: {}, created_at: new Date() },
        { id: 'comp-2', name: 'Company 2', timezone: 'UTC', locale: 'en', privacy_settings: {}, created_at: new Date() },
      ]);

      vi.mocked(storage.getActiveShiftsByCompany).mockResolvedValue([]);

      const result = await shiftMonitor.runGlobalMonitoring();

      expect(result).toEqual({
        companiesProcessed: 2,
        totalViolations: 0,
        totalExceptions: 0,
      });

      expect(storage.getActiveShiftsByCompany).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in global monitoring', async () => {
      vi.mocked(storage.getAllCompanies).mockRejectedValue(new Error('DB error'));

      const result = await shiftMonitor.runGlobalMonitoring();

      expect(result).toEqual({
        companiesProcessed: 0,
        totalViolations: 0,
        totalExceptions: 0,
      });
    });
  });
});

