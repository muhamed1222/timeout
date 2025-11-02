import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type {
  Shift,
  InsertShift,
  WorkInterval,
  InsertWorkInterval,
  BreakInterval,
  InsertBreakInterval,
  DailyReport,
  InsertDailyReport,
  Employee
} from '../../shared/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Repository for Shifts, Work Intervals, Break Intervals, and Daily Reports
 */
export class ShiftRepository extends BaseRepository<Shift, InsertShift> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.shift);
  }

  /**
   * Find shifts by employee ID
   */
  async findByEmployeeId(employeeId: string, limit = 10): Promise<Shift[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).employee_id, employeeId))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).planned_start_at} DESC`)
      .limit(limit);
    
    return results as Shift[];
  }

  /**
   * Find shifts by multiple employee IDs (optimized to avoid N+1 queries)
   */
  async findByEmployeeIds(employeeIds: string[]): Promise<Shift[]> {
    if (employeeIds.length === 0) return [];
    
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(sql`${(this.table as any).employee_id} = ANY(${employeeIds})`)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).planned_start_at} DESC`);
    
    return results as Shift[];
  }

  /**
   * Find shifts by employee ID and date range
   */
  async findByEmployeeIdAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Shift[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          eq((this.table as any).employee_id, employeeId),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          gte((this.table as any).planned_start_at, startDate),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          lte((this.table as any).planned_start_at, endDate)
        )
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).planned_start_at} DESC`);

    return results as Shift[];
  }

  /**
   * Find active shifts by company ID
   */
  async findActiveByCompanyId(companyId: string): Promise<(Shift & { employee: Employee })[]> {
    const results = await this.db
      .select({
        id: schema.shift.id,
        employee_id: schema.shift.employee_id,
        planned_start_at: schema.shift.planned_start_at,
        planned_end_at: schema.shift.planned_end_at,
        actual_start_at: schema.shift.actual_start_at,
        actual_end_at: schema.shift.actual_end_at,
        status: schema.shift.status,
        created_at: schema.shift.created_at,
        employee: {
          id: schema.employee.id,
          company_id: schema.employee.company_id,
          full_name: schema.employee.full_name,
          position: schema.employee.position,
          telegram_user_id: schema.employee.telegram_user_id,
          status: schema.employee.status,
          tz: schema.employee.tz,
          created_at: schema.employee.created_at
        }
      })
      .from(schema.shift)
      .innerJoin(schema.employee, eq(schema.shift.employee_id, schema.employee.id))
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          eq(schema.shift.status, 'active')
        )
      );

    return results as (Shift & { employee: Employee })[];
  }

  /**
   * Find today's shift for employee
   */
  async findTodayByEmployeeId(employeeId: string): Promise<Shift | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          eq((this.table as any).employee_id, employeeId),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          sql`${(this.table as any).planned_start_at} >= ${today.toISOString()}`,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          sql`${(this.table as any).planned_start_at} <= ${tomorrow.toISOString()}`
        )
      )
      .limit(1);

    return results[0] as Shift | undefined;
  }

  /**
   * Find shifts by status
   */
  async findByStatus(employeeId: string, status: string): Promise<Shift[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          eq((this.table as any).employee_id, employeeId),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          eq((this.table as any).status, status)
        )
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).planned_start_at} DESC`);

    return results as Shift[];
  }

  // Work Intervals

  /**
   * Create work interval
   */
  async createWorkInterval(interval: InsertWorkInterval): Promise<WorkInterval> {
    const results = await this.db
      .insert(schema.work_interval)
      .values(interval as any)
      .returning();

    return results[0] as WorkInterval;
  }

  /**
   * Find work intervals by shift ID
   */
  async findWorkIntervalsByShiftId(shiftId: string): Promise<WorkInterval[]> {
    const results = await this.db
      .select()
      .from(schema.work_interval)
      .where(eq(schema.work_interval.shift_id, shiftId))
      .orderBy(schema.work_interval.start_at);

    return results as WorkInterval[];
  }

  /**
   * Update work interval
   */
  async updateWorkInterval(id: string, updates: Partial<InsertWorkInterval>): Promise<WorkInterval | undefined> {
    const results = await this.db
      .update(schema.work_interval)
      .set(updates as any)
      .where(eq(schema.work_interval.id, id))
      .returning();

    return results[0] as WorkInterval | undefined;
  }

  // Break Intervals

  /**
   * Create break interval
   */
  async createBreakInterval(interval: InsertBreakInterval): Promise<BreakInterval> {
    const results = await this.db
      .insert(schema.break_interval)
      .values(interval as any)
      .returning();

    return results[0] as BreakInterval;
  }

  /**
   * Find break intervals by shift ID
   */
  async findBreakIntervalsByShiftId(shiftId: string): Promise<BreakInterval[]> {
    const results = await this.db
      .select()
      .from(schema.break_interval)
      .where(eq(schema.break_interval.shift_id, shiftId))
      .orderBy(schema.break_interval.start_at);

    return results as BreakInterval[];
  }

  /**
   * Update break interval
   */
  async updateBreakInterval(id: string, updates: Partial<InsertBreakInterval>): Promise<BreakInterval | undefined> {
    const results = await this.db
      .update(schema.break_interval)
      .set(updates as any)
      .where(eq(schema.break_interval.id, id))
      .returning();

    return results[0] as BreakInterval | undefined;
  }

  // Daily Reports

  /**
   * Create daily report
   */
  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const results = await this.db
      .insert(schema.daily_report)
      .values(report as any)
      .returning();

    return results[0] as DailyReport;
  }

  /**
   * Find daily report by shift ID
   */
  async findDailyReportByShiftId(shiftId: string): Promise<DailyReport | undefined> {
    const results = await this.db
      .select()
      .from(schema.daily_report)
      .where(eq(schema.daily_report.shift_id, shiftId))
      .limit(1);

    return results[0] as DailyReport | undefined;
  }

  /**
   * Find daily reports by company ID
   */
  async findDailyReportsByCompanyId(
    companyId: string,
    limit = 50
  ): Promise<(DailyReport & { shift: Shift; employee: Employee })[]> {
    const results = await this.db
      .select({
        id: schema.daily_report.id,
        shift_id: schema.daily_report.shift_id,
        planned_items: schema.daily_report.planned_items,
        done_items: schema.daily_report.done_items,
        blockers: schema.daily_report.blockers,
        tasks_links: schema.daily_report.tasks_links,
        time_spent: schema.daily_report.time_spent,
        attachments: schema.daily_report.attachments,
        submitted_at: schema.daily_report.submitted_at,
        shift: {
          id: schema.shift.id,
          employee_id: schema.shift.employee_id,
          planned_start_at: schema.shift.planned_start_at,
          planned_end_at: schema.shift.planned_end_at,
          actual_start_at: schema.shift.actual_start_at,
          actual_end_at: schema.shift.actual_end_at,
          status: schema.shift.status,
          created_at: schema.shift.created_at
        },
        employee: {
          id: schema.employee.id,
          company_id: schema.employee.company_id,
          full_name: schema.employee.full_name,
          position: schema.employee.position,
          telegram_user_id: schema.employee.telegram_user_id,
          status: schema.employee.status,
          tz: schema.employee.tz,
          created_at: schema.employee.created_at
        }
      })
      .from(schema.daily_report)
      .innerJoin(schema.shift, eq(schema.daily_report.shift_id, schema.shift.id))
      .innerJoin(schema.employee, eq(schema.shift.employee_id, schema.employee.id))
      .where(eq(schema.employee.company_id, companyId))
      .orderBy(sql`${schema.daily_report.submitted_at} DESC`)
      .limit(limit);

    return results as (DailyReport & { shift: Shift; employee: Employee })[];
  }
}

