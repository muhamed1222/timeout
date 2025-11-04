import { BaseRepository } from "./BaseRepository.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../shared/schema.js";
import type { Reminder, InsertReminder, Employee } from "../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

/**
 * Repository for Reminders
 */
export class ReminderRepository extends BaseRepository<Reminder, InsertReminder> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.reminder);
  }

  /**
   * Find pending reminders (not sent yet)
   */
  async findPending(beforeTime?: Date): Promise<(Reminder & { employee: Employee })[]> {
    const timeFilter = beforeTime || new Date();
    const results = await this.db
      .select({
        id: schema.reminder.id,
        employee_id: schema.reminder.employee_id,
        type: schema.reminder.type,
        planned_at: schema.reminder.planned_at,
        sent_at: schema.reminder.sent_at,
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
      .from(schema.reminder)
      .innerJoin(schema.employee, eq(schema.reminder.employee_id, schema.employee.id))
      .where(
        and(
          sql`${schema.reminder.planned_at} <= ${timeFilter.toISOString()}`,
          sql`${schema.reminder.sent_at} IS NULL`,
        ),
      )
      .orderBy(schema.reminder.planned_at);

    return results as (Reminder & { employee: Employee })[];
  }

  /**
   * Find reminders by employee ID
   */
  async findByEmployeeId(employeeId: string): Promise<Reminder[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).employee_id, employeeId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(sql`${(this.table as any).planned_at} DESC`);

    return results as Reminder[];
  }

  /**
   * Mark reminder as sent
   */
  async markAsSent(id: string): Promise<Reminder | undefined> {
    const results = await this.db
      .update(this.table)
      .set({ sent_at: sql`now()` } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id))
      .returning();

    return results[0] as Reminder | undefined;
  }
}

