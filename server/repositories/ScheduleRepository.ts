import { BaseRepository } from "./BaseRepository.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@outcasts/shared/schema.js";
import type { ScheduleTemplate, InsertScheduleTemplate } from "@outcasts/shared/schema.js";
import { eq, and, or, sql } from "drizzle-orm";

/**
 * Repository for Schedule Templates and Employee Schedules
 */
export class ScheduleRepository extends BaseRepository<ScheduleTemplate, InsertScheduleTemplate> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.schedule_template);
  }

  /**
   * Find schedule templates by company ID
   */
  async findByCompanyId(companyId: string): Promise<ScheduleTemplate[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(schema.schedule_template.company_id, companyId));

    return results as ScheduleTemplate[];
  }

  /**
   * Assign schedule to employee
   */
  async assignToEmployee(
    employeeId: string,
    scheduleId: string,
    validFrom: Date,
    validTo?: Date,
  ): Promise<void> {
    await this.db
      .insert(schema.employee_schedule)
      .values({
        employee_id: employeeId,
        schedule_id: scheduleId,
        valid_from: validFrom.toISOString().split("T")[0],
        valid_to: validTo ? validTo.toISOString().split("T")[0] : null,
      } as any);
  }

  /**
   * Find employee schedules
   */
  async findEmployeeSchedules(employeeId: string): Promise<any[]> {
    const results = await this.db
      .select({
        employee_id: schema.employee_schedule.employee_id,
        schedule_id: schema.employee_schedule.schedule_id,
        valid_from: schema.employee_schedule.valid_from,
        valid_to: schema.employee_schedule.valid_to,
        schedule: {
          id: schema.schedule_template.id,
          name: schema.schedule_template.name,
          rules: schema.schedule_template.rules,
          company_id: schema.schedule_template.company_id,
        },
      })
      .from(schema.employee_schedule)
      .innerJoin(schema.schedule_template, eq(schema.employee_schedule.schedule_id, schema.schedule_template.id))
      .where(eq(schema.employee_schedule.employee_id, employeeId))
      .orderBy(sql`${schema.employee_schedule.valid_from} DESC`);

    return results;
  }

  /**
   * Find active employee schedule for date
   */
  async findActiveEmployeeSchedule(employeeId: string, date: Date): Promise<any | undefined> {
    const dateStr = date.toISOString().split("T")[0];
    const results = await this.db
      .select({
        employee_id: schema.employee_schedule.employee_id,
        schedule_id: schema.employee_schedule.schedule_id,
        valid_from: schema.employee_schedule.valid_from,
        valid_to: schema.employee_schedule.valid_to,
        schedule: {
          id: schema.schedule_template.id,
          name: schema.schedule_template.name,
          rules: schema.schedule_template.rules,
          company_id: schema.schedule_template.company_id,
        },
      })
      .from(schema.employee_schedule)
      .innerJoin(schema.schedule_template, eq(schema.employee_schedule.schedule_id, schema.schedule_template.id))
      .where(
        and(
          eq(schema.employee_schedule.employee_id, employeeId),
          sql`${schema.employee_schedule.valid_from} <= ${dateStr}`,
          or(
            sql`${schema.employee_schedule.valid_to} IS NULL`,
            sql`${schema.employee_schedule.valid_to} >= ${dateStr}`,
          ),
        ),
      )
      .orderBy(sql`${schema.employee_schedule.valid_from} DESC`)
      .limit(1);

    return results[0];
  }

  /**
   * Remove employee schedule assignment
   */
  async removeEmployeeSchedule(employeeId: string, scheduleId: string): Promise<void> {
    await this.db
      .delete(schema.employee_schedule)
      .where(
        and(
          eq(schema.employee_schedule.employee_id, employeeId),
          eq(schema.employee_schedule.schedule_id, scheduleId),
        ),
      );
  }

  /**
   * Find all employee schedule assignments for a company
   */
  async findEmployeeSchedulesByCompanyId(companyId: string): Promise<any[]> {
    const results = await this.db
      .select({
        employee_id: schema.employee_schedule.employee_id,
        schedule_id: schema.employee_schedule.schedule_id,
        valid_from: schema.employee_schedule.valid_from,
        valid_to: schema.employee_schedule.valid_to,
        employee: {
          id: schema.employee.id,
          full_name: schema.employee.full_name,
          position: schema.employee.position,
        },
        schedule: {
          id: schema.schedule_template.id,
          name: schema.schedule_template.name,
          rules: schema.schedule_template.rules,
          company_id: schema.schedule_template.company_id,
        },
      })
      .from(schema.employee_schedule)
      .innerJoin(schema.schedule_template, eq(schema.employee_schedule.schedule_id, schema.schedule_template.id))
      .innerJoin(schema.employee, eq(schema.employee_schedule.employee_id, schema.employee.id))
      .where(eq(schema.schedule_template.company_id, companyId))
      .orderBy(sql`${schema.employee_schedule.valid_from} DESC`);

    return results;
  }
}

