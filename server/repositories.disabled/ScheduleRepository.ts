import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { ScheduleTemplate, InsertScheduleTemplate } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Repository for Schedule Templates
 */
export class ScheduleRepository extends BaseRepository<ScheduleTemplate, InsertScheduleTemplate> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.schedule_template);
  }

  /**
   * Find schedule templates by company
   */
  async findByCompanyId(companyId: string): Promise<ScheduleTemplate[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(schema.schedule_template.company_id, companyId));

    return results as ScheduleTemplate[];
  }

  /**
   * Find active schedule templates by company
   */
  async findActiveByCompanyId(companyId: string): Promise<ScheduleTemplate[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.schedule_template.company_id, companyId),
          eq(schema.schedule_template.is_active, true)
        )
      );

    return results as ScheduleTemplate[];
  }

  /**
   * Find schedule template by name
   */
  async findByName(companyId: string, name: string): Promise<ScheduleTemplate | undefined> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.schedule_template.company_id, companyId),
          eq(schema.schedule_template.name, name)
        )
      )
      .limit(1);

    return results[0] as ScheduleTemplate | undefined;
  }

  /**
   * Activate schedule template
   */
  async activate(id: string): Promise<ScheduleTemplate | undefined> {
    return this.update(id, { is_active: true });
  }

  /**
   * Deactivate schedule template
   */
  async deactivate(id: string): Promise<ScheduleTemplate | undefined> {
    return this.update(id, { is_active: false });
  }

  /**
   * Duplicate schedule template
   */
  async duplicate(id: string, newName: string): Promise<ScheduleTemplate | undefined> {
    const original = await this.findById(id);
    if (!original) return undefined;

    const { id: _, created_at, updated_at, ...data } = original;

    return this.create({
      ...data,
      name: newName,
      is_active: false,
    });
  }

  /**
   * Count active schedules
   */
  async countActive(companyId: string): Promise<number> {
    const result = await this.db
      .select({ count: schema.sql<number>`count(*)` })
      .from(this.table)
      .where(
        and(
          eq(schema.schedule_template.company_id, companyId),
          eq(schema.schedule_template.is_active, true)
        )
      );

    return Number(result[0]?.count || 0);
  }
}

