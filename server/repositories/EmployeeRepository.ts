import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { Employee, InsertEmployee } from '../../shared/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';

/**
 * Repository for Employee entity
 */
export class EmployeeRepository extends BaseRepository<Employee, InsertEmployee> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.employee);
  }

  /**
   * Find employee by Telegram user ID
   */
  async findByTelegramId(telegramUserId: string): Promise<Employee | undefined> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(schema.employee.telegram_user_id, telegramUserId))
      .limit(1);

    return results[0] as Employee | undefined;
  }

  /**
   * Find all employees by company ID
   */
  async findByCompanyId(companyId: string): Promise<Employee[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(schema.employee.company_id, companyId));

    return results as Employee[];
  }

  /**
   * Find active employees by company ID
   */
  async findActiveByCompanyId(companyId: string): Promise<Employee[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          eq(schema.employee.status, 'active')
        )
      );

    return results as Employee[];
  }

  /**
   * Find employees by role
   */
  async findByRole(companyId: string, role: 'admin' | 'manager' | 'employee'): Promise<Employee[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          sql`${(this.table as any).role} = ${role}`
        )
      );

    return results as Employee[];
  }

  /**
   * Search employees by name or phone
   */
  async search(companyId: string, query: string): Promise<Employee[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          or(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            sql`${(this.table as any).full_name} ILIKE ${`%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`}`,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            sql`${(this.table as any).phone} ILIKE ${`%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`}`
          )
        )
      );

    return results as Employee[];
  }

  /**
   * Count employees by status
   */
  async countByStatus(companyId: string, status: 'active' | 'inactive'): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table)
      .where(
        and(
          eq(schema.employee.company_id, companyId),
          eq(schema.employee.status, status)
        )
      );

    return Number(result[0]?.count || 0);
  }

  /**
   * Update employee status
   */
  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<Employee | undefined> {
    return this.update(id, { status });
  }

  /**
   * Check if employee belongs to company
   */
  async belongsToCompany(employeeId: string, companyId: string): Promise<boolean> {
    const employee = await this.findById(employeeId);
    return employee?.company_id === companyId;
  }
}

