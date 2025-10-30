import { storage } from "../storage.js";
import { type InsertException, type Shift, type Employee } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";

export interface ShiftViolation {
  type: 'late_start' | 'early_end' | 'missed_shift' | 'long_break' | 'no_break_end';
  employeeId: string;
  shiftId?: string;
  shiftDate: string; // YYYY-MM-DD format
  details: {
    planned?: Date;
    actual?: Date;
    duration?: number;
    threshold?: number;
    [key: string]: any;
  };
  severity: 1 | 2 | 3; // 1=low, 2=medium, 3=high
}

export class ShiftMonitor {
  // Configuration thresholds (in minutes)
  private readonly LATE_THRESHOLD = 15; // 15 minutes late
  private readonly EARLY_END_THRESHOLD = 15; // 15 minutes early
  private readonly LONG_BREAK_THRESHOLD = 90; // 90 minutes break
  private readonly MISSED_SHIFT_THRESHOLD = 60; // 60 minutes after planned start

  async checkShiftViolations(companyId: string): Promise<ShiftViolation[]> {
    const violations: ShiftViolation[] = [];
    
    try {
      // Get active shifts for the company
      const activeShifts = await storage.getActiveShiftsByCompany(companyId);
      
      for (const shiftWithEmployee of activeShifts) {
        const shiftViolations = await this.checkSingleShift(shiftWithEmployee);
        violations.push(...shiftViolations);
      }
      
      return violations;
    } catch (error) {
      logger.error("Error checking shift violations", { error });
      return [];
    }
  }

  private async checkSingleShift(shiftWithEmployee: Shift & { employee: Employee }): Promise<ShiftViolation[]> {
    const violations: ShiftViolation[] = [];
    const { shift, employee } = this.destructureShiftWithEmployee(shiftWithEmployee);
    const now = new Date();

    // Get work intervals and breaks for this shift
    const workIntervals = await storage.getWorkIntervalsByShift(shift.id);
    const breakIntervals = await storage.getBreakIntervalsByShift(shift.id);

    // Check for late start or missed shift
    const plannedStart = new Date(shift.planned_start_at);
    const shiftDate = plannedStart.toISOString().split('T')[0];
    
    if (shift.status === 'planned') {
      // Check for missed shift (never started)
      const timeSinceStart = now.getTime() - plannedStart.getTime();
      const minutesLate = timeSinceStart / (1000 * 60);
      
      if (minutesLate > this.MISSED_SHIFT_THRESHOLD) {
        violations.push({
          type: 'missed_shift',
          employeeId: employee.id,
          shiftId: shift.id,
          shiftDate,
          details: {
            planned: plannedStart,
            actual: undefined,
            threshold: this.MISSED_SHIFT_THRESHOLD
          },
          severity: 3
        });
      }
    } else if (workIntervals.length > 0) {
      // Check actual start time against planned start (for active/completed shifts)
      const firstInterval = workIntervals[0];
      const actualStart = new Date(firstInterval.start_at);
      const minutesLate = (actualStart.getTime() - plannedStart.getTime()) / (1000 * 60);
      
      if (minutesLate > this.LATE_THRESHOLD) {
        violations.push({
          type: 'late_start',
          employeeId: employee.id,
          shiftId: shift.id,
          shiftDate,
          details: {
            planned: plannedStart,
            actual: actualStart,
            threshold: this.LATE_THRESHOLD,
            minutesLate: Math.floor(minutesLate)
          },
          severity: minutesLate > 30 ? 2 : 1
        });
      }
    }

    // Check for early end (if shift is completed)
    if (shift.status === 'completed' && workIntervals.length > 0) {
      const lastInterval = workIntervals[workIntervals.length - 1];
      if (lastInterval.end_at) {
        const plannedEnd = new Date(shift.planned_end_at);
        const actualEnd = new Date(lastInterval.end_at);
        const minutesEarly = (plannedEnd.getTime() - actualEnd.getTime()) / (1000 * 60);
        
        if (minutesEarly > this.EARLY_END_THRESHOLD) {
          violations.push({
            type: 'early_end',
            employeeId: employee.id,
            shiftId: shift.id,
            shiftDate,
            details: {
              planned: plannedEnd,
              actual: actualEnd,
              threshold: this.EARLY_END_THRESHOLD,
              minutesEarly: Math.floor(minutesEarly)
            },
            severity: minutesEarly > 30 ? 2 : 1
          });
        }
      }
    }

    // Check for long breaks
    for (const breakInterval of breakIntervals) {
      if (breakInterval.start_at && breakInterval.end_at) {
        const breakDuration = (new Date(breakInterval.end_at).getTime() - new Date(breakInterval.start_at).getTime()) / (1000 * 60);
        
        if (breakDuration > this.LONG_BREAK_THRESHOLD) {
          violations.push({
            type: 'long_break',
            employeeId: employee.id,
            shiftId: shift.id,
            shiftDate,
            details: {
              breakStart: new Date(breakInterval.start_at),
              breakEnd: new Date(breakInterval.end_at),
              duration: Math.floor(breakDuration),
              threshold: this.LONG_BREAK_THRESHOLD
            },
            severity: breakDuration > 180 ? 3 : 2
          });
        }
      } else if (breakInterval.start_at && !breakInterval.end_at) {
        // Check for breaks that haven't been ended
        const breakDuration = (now.getTime() - new Date(breakInterval.start_at).getTime()) / (1000 * 60);
        
        if (breakDuration > this.LONG_BREAK_THRESHOLD) {
          violations.push({
            type: 'no_break_end',
            employeeId: employee.id,
            shiftId: shift.id,
            shiftDate,
            details: {
              breakStart: new Date(breakInterval.start_at),
              duration: Math.floor(breakDuration),
              threshold: this.LONG_BREAK_THRESHOLD
            },
            severity: 3
          });
        }
      }
    }

    return violations;
  }

  async createExceptionsFromViolations(violations: ShiftViolation[]): Promise<void> {
    for (const violation of violations) {
      try {
        // Get employee to access company_id
        const employee = await storage.getEmployee(violation.employeeId);
        if (!employee) {
          logger.error("Employee not found", { employeeId: violation.employeeId });
          continue;
        }

        // Check if exception already exists for this violation
        const existingExceptions = await storage.getExceptionsByCompany(employee.company_id);
        
        const alreadyExists = existingExceptions.some(ex => 
          ex.employee_id === violation.employeeId &&
          ex.date === violation.shiftDate &&
          ex.kind === violation.type &&
          !ex.resolved_at
        );

        if (!alreadyExists) {
          // Create violation in rating system first
          let violationId: string | undefined;
          
          try {
            // Get violation rules for company
            const rules = await storage.getViolationRulesByCompany(employee.company_id);
            
            // Map violation type to rule code
            const ruleCodeMap: Record<string, string> = {
              'late_start': 'late',
              'early_end': 'early_end',
              'missed_shift': 'missed_shift',
              'long_break': 'long_break',
              'no_break_end': 'no_break_end'
            };
            
            const ruleCode = ruleCodeMap[violation.type];
            if (!ruleCode) {
              logger.warn("No rule mapping for violation type", { violationType: violation.type });
              continue;
            }

            // Find matching rule
            const rule = rules.find((r: any) => r.code === ruleCode && r.is_active);
            if (!rule) {
              logger.warn("No active rule found for code", { ruleCode });
              continue;
            }

            // Create violation record
            const createdViolation = await storage.createViolation({
              employee_id: violation.employeeId,
              company_id: employee.company_id,
              rule_id: rule.id,
              source: 'auto',
              reason: `Auto-detected: ${violation.type}`,
              penalty: rule.penalty_percent
            } as any);

            violationId = createdViolation.id;
            logger.info("Created violation", { 
              violationType: violation.type, 
              employeeId: violation.employeeId,
              violationId
            });

            // Recalculate employee rating for current period
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            await storage.updateEmployeeRatingFromViolations(
              violation.employeeId,
              periodStart,
              periodEnd
            );

            logger.info("Updated rating for employee", { employeeId: violation.employeeId });
          } catch (ratingError) {
            logger.error("Failed to create violation or update rating", { error: ratingError });
            // Continue anyway - will create exception without violation_id
          }

          // Create exception with link to violation
          const exception: InsertException = {
            employee_id: violation.employeeId,
            date: violation.shiftDate,
            kind: violation.type,
            severity: violation.severity,
            details: {
              shiftId: violation.shiftId,
              ...violation.details,
              detectedAt: new Date().toISOString()
            },
            violation_id: violationId
          };

          await storage.createException(exception);
          logger.info("Created exception", { 
            violationType: violation.type, 
            employeeId: violation.employeeId,
            violationId: violationId || undefined,
            linked: !!violationId
          });
        }
      } catch (error) {
        logger.error("Failed to create exception for violation", { violation, error });
      }
    }
  }

  async processCompanyShifts(companyId: string): Promise<{
    violationsFound: number;
    exceptionsCreated: number;
  }> {
    try {
      const violations = await this.checkShiftViolations(companyId);
      const initialExceptions = await storage.getExceptionsByCompany(companyId);
      
      await this.createExceptionsFromViolations(violations);
      
      const finalExceptions = await storage.getExceptionsByCompany(companyId);
      const exceptionsCreated = finalExceptions.length - initialExceptions.length;

      logger.info("Processed company shifts", { 
        companyId, 
        violationsFound: violations.length, 
        exceptionsCreated 
      });
      
      return {
        violationsFound: violations.length,
        exceptionsCreated
      };
    } catch (error) {
      logger.error("Failed to process shifts for company", { companyId, error });
      return { violationsFound: 0, exceptionsCreated: 0 };
    }
  }

  // Helper method to extract shift and employee from the joined result
  private destructureShiftWithEmployee(shiftWithEmployee: Shift & { employee: Employee }): {
    shift: Shift;
    employee: Employee;
  } {
    const { employee, ...shift } = shiftWithEmployee;
    return { shift: shift as Shift, employee };
  }

  // Method to run monitoring for all companies (for cron jobs)
  async runGlobalMonitoring(): Promise<{
    companiesProcessed: number;
    totalViolations: number;
    totalExceptions: number;
  }> {
    try {
      logger.info("Starting global shift monitoring");
      
      const companies = await storage.getAllCompanies();
      let totalViolations = 0;
      let totalExceptions = 0;
      
      for (const company of companies) {
        const result = await this.processCompanyShifts(company.id);
        totalViolations += result.violationsFound;
        totalExceptions += result.exceptionsCreated;
      }
      
      logger.info("Global shift monitoring completed", { 
        companiesProcessed: companies.length, 
        totalViolations, 
        totalExceptions 
      });
      
      return {
        companiesProcessed: companies.length,
        totalViolations,
        totalExceptions
      };
    } catch (error) {
      logger.error("Failed to run global monitoring", { error });
      return {
        companiesProcessed: 0,
        totalViolations: 0,
        totalExceptions: 0
      };
    }
  }
}

export const shiftMonitor = new ShiftMonitor();