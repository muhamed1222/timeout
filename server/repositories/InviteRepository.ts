import { BaseRepository } from "./BaseRepository.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@outcasts/shared/schema.js";
import type { EmployeeInvite, InsertEmployeeInvite } from "@outcasts/shared/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).code, code))
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).company_id, companyId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(desc((this.table as any).created_at));

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq((this.table as any).company_id, companyId),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sql`${(this.table as any).used_by_employee} IS NULL`,
        ),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(desc((this.table as any).created_at));

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
        used_at: sql`now()`,
      } as any)
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq((this.table as any).code, code),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sql`${(this.table as any).used_by_employee} IS NULL`,
        ),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).code, code))
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sql`${(this.table as any).created_at} < ${twoMinutesAgo.toISOString()}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sql`${(this.table as any).used_by_employee} IS NULL`,
        ),
      );

    return (result as { rowCount?: number }).rowCount ?? 0;
  }
}

