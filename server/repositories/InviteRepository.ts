import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { EmployeeInvite, InsertEmployeeInvite } from '../../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Repository for Employee Invites
 */
export class InviteRepository extends BaseRepository<EmployeeInvite, InsertEmployeeInvite> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.employee_invite);
  }

  /**
   * Find invite by code
   */
  async findByCode(code: string): Promise<EmployeeInvite | undefined> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.code, code))
      .limit(1);

    return results[0] as EmployeeInvite | undefined;
  }

  /**
   * Find invites by company ID
   */
  async findByCompanyId(companyId: string): Promise<EmployeeInvite[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.company_id, companyId))
      .orderBy(desc(this.table.created_at));

    return results as EmployeeInvite[];
  }

  /**
   * Find unused invites by company ID
   */
  async findUnusedByCompanyId(companyId: string): Promise<EmployeeInvite[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.company_id, companyId),
          sql`${this.table.used_by_employee} IS NULL`
        )
      )
      .orderBy(desc(this.table.created_at));

    return results as EmployeeInvite[];
  }

  /**
   * Use invite (mark as used)
   */
  async useInvite(code: string, employeeId: string): Promise<EmployeeInvite | undefined> {
    const results = await this.db
      .update(this.table)
      .set({
        used_by_employee: employeeId,
        used_at: sql`now()`
      } as any)
      .where(
        and(
          eq(this.table.code, code),
          sql`${this.table.used_by_employee} IS NULL`
        )
      )
      .returning();

    return results[0] as EmployeeInvite | undefined;
  }

  /**
   * Update invite by code
   */
  async updateByCode(code: string, updates: Partial<InsertEmployeeInvite>): Promise<EmployeeInvite | undefined> {
    const results = await this.db
      .update(this.table)
      .set(updates as any)
      .where(eq(this.table.code, code))
      .returning();

    return results[0] as EmployeeInvite | undefined;
  }

  /**
   * Cleanup expired invites (older than 2 minutes and unused)
   */
  async cleanupExpired(): Promise<number> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const result = await this.db
      .delete(this.table)
      .where(
        and(
          sql`${this.table.created_at} < ${twoMinutesAgo.toISOString()}`,
          sql`${this.table.used_by_employee} IS NULL`
        )
      );

    return (result as any).rowCount || 0;
  }
}

