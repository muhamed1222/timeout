import { BaseRepository } from "./BaseRepository.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../shared/schema.js";
import type { Exception, InsertException, Employee } from "../../shared/schema.js";
import { eq, sql, and } from "drizzle-orm";

/**
 * Repository for Exceptions
 */
export class ExceptionRepository extends BaseRepository<Exception, InsertException> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.exception);
  }

  /**
   * Find exceptions by company ID
   */
  async findByCompanyId(companyId: string): Promise<(Exception & { employee: Employee })[]> {
    const results = await this.db
      .select({
        id: schema.exception.id,
        employee_id: schema.exception.employee_id,
        date: schema.exception.date,
        kind: schema.exception.kind,
        severity: schema.exception.severity,
        details: schema.exception.details,
        resolved_at: schema.exception.resolved_at,
        violation_id: schema.exception.violation_id,
        employee: {
          id: schema.employee.id,
          company_id: schema.employee.company_id,
          full_name: schema.employee.full_name,
          position: schema.employee.position,
          telegram_user_id: schema.employee.telegram_user_id,
          status: schema.employee.status,
          tz: schema.employee.tz,
          created_at: schema.employee.created_at,
        },
      })
      .from(schema.exception)
      .innerJoin(schema.employee, eq(schema.exception.employee_id, schema.employee.id))
      .where(eq(schema.employee.company_id, companyId))
      .orderBy(sql`${schema.exception.date} DESC`);

    return results as (Exception & { employee: Employee })[];
  }

  /**
   * Find exceptions by employee ID
   */
  async findByEmployeeId(employeeId: string): Promise<Exception[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).employee_id, employeeId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).date} DESC`);

    return results as Exception[];
  }

  /**
   * Find unresolved exceptions
   */
  async findUnresolved(companyId: string): Promise<(Exception & { employee: Employee })[]> {
    const results = await this.db
      .select({
        id: schema.exception.id,
        employee_id: schema.exception.employee_id,
        date: schema.exception.date,
        kind: schema.exception.kind,
        severity: schema.exception.severity,
        details: schema.exception.details,
        resolved_at: schema.exception.resolved_at,
        violation_id: schema.exception.violation_id,
        employee: {
          id: schema.employee.id,
          company_id: schema.employee.company_id,
          full_name: schema.employee.full_name,
          position: schema.employee.position,
          telegram_user_id: schema.employee.telegram_user_id,
          status: schema.employee.status,
          tz: schema.employee.tz,
          created_at: schema.employee.created_at,
        },
      })
      .from(schema.exception)
      .innerJoin(schema.employee, eq(schema.exception.employee_id, schema.employee.id))
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          sql`${schema.exception.resolved_at} IS NULL`,
        ),
      )
      .orderBy(sql`${schema.exception.date} DESC`);

    return results as (Exception & { employee: Employee })[];
  }

  /**
   * Resolve exception by ID
   */
  async resolve(id: string): Promise<Exception | undefined> {
    const results = await this.db
      .update(this.table)
      .set({ resolved_at: sql`now()` } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id))
      .returning();

    return results[0] as Exception | undefined;
  }
}

