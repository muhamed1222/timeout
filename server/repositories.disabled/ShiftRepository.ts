import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { Shift, InsertShift, Employee } from '../../shared/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * Repository for Shift entity
 */
export class ShiftRepository extends BaseRepository<Shift, InsertShift> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.shift);
  }

  /**
   * Find shifts by employee ID
   */
  async findByEmployeeId(employeeId: string, limit?: number): Promise<Shift[]> {
    let query = this.db
      .select()
      .from(this.table)
      .where(eq(schema.shift.employee_id, employeeId))
      .orderBy(desc(schema.shift.planned_start_at));

    if (limit) {
      query = query.limit(limit);
    }

    return query as Promise<Shift[]>;
  }

  /**
   * Find shifts by employee and date range
   */
  async findByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Shift[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.shift.employee_id, employeeId),
          gte(schema.shift.planned_start_at, startDate),
          lte(schema.shift.planned_end_at, endDate)
        )
      )
      .orderBy(schema.shift.planned_start_at);

    return results as Shift[];
  }

  /**
   * Find active shifts by company
   */
  async findActiveByCompany(companyId: string): Promise<(Shift & { employee: Employee })[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .innerJoin(
        schema.employee,
        eq(schema.shift.employee_id, schema.employee.id)
      )
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          eq(schema.shift.status, 'active')
        )
      );

    return results.map((row: any) => ({
      ...row.shift,
      employee: row.employee,
    })) as (Shift & { employee: Employee })[];
  }

  /**
   * Find today's shift for employee
   */
  async findTodayShift(employeeId: string): Promise<Shift | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.shift.employee_id, employeeId),
          gte(schema.shift.planned_start_at, today),
          lte(schema.shift.planned_start_at, tomorrow)
        )
      )
      .limit(1);

    return results[0] as Shift | undefined;
  }

  /**
   * Find shifts by status
   */
  async findByStatus(
    companyId: string,
    status: 'planned' | 'active' | 'completed' | 'cancelled'
  ): Promise<Shift[]> {
    const results = await this.db
      .select({
        shift: this.table,
      })
      .from(this.table)
      .innerJoin(
        schema.employee,
        eq(schema.shift.employee_id, schema.employee.id)
      )
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          eq(schema.shift.status, status)
        )
      );

    return results.map((row: any) => row.shift) as Shift[];
  }

  /**
   * Start shift
   */
  async startShift(id: string, actualStartAt: Date): Promise<Shift | undefined> {
    return this.update(id, {
      status: 'active',
      actual_start_at: actualStartAt,
    });
  }

  /**
   * Complete shift
   */
  async completeShift(id: string, actualEndAt: Date): Promise<Shift | undefined> {
    return this.update(id, {
      status: 'completed',
      actual_end_at: actualEndAt,
    });
  }

  /**
   * Cancel shift
   */
  async cancelShift(id: string): Promise<Shift | undefined> {
    return this.update(id, {
      status: 'cancelled',
    });
  }

  /**
   * Count shifts by date range
   */
  async countByDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.db
      .select({ count: schema.sql<number>`count(*)` })
      .from(this.table)
      .where(
        and(
          eq(schema.shift.employee_id, employeeId),
          gte(schema.shift.planned_start_at, startDate),
          lte(schema.shift.planned_end_at, endDate)
        )
      );

    return Number(result[0]?.count || 0);
  }
}

