import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { AuditLog, InsertAuditLog } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

/**
 * Repository for Audit Logs
 */
export class AuditRepository extends BaseRepository<AuditLog, InsertAuditLog> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.audit_log);
  }

  /**
   * Create audit log entry
   */
  async log(
    actor: string,
    action: string,
    entity: string,
    payload?: Record<string, unknown>
  ): Promise<AuditLog> {
    const results = await this.db
      .insert(this.table)
      .values({
        actor,
        action,
        entity,
        payload: payload || null
      } as any)
      .returning();

    return results[0] as AuditLog;
  }

  /**
   * Find audit logs by actor
   */
  async findByActor(actor: string, limit = 100): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).actor, actor))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(desc((this.table as any).at))
      .limit(limit);

    return results as AuditLog[];
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(entity: string, limit = 100): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).entity, entity))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(desc((this.table as any).at))
      .limit(limit);

    return results as AuditLog[];
  }

  /**
   * Find audit logs by action
   */
  async findByAction(action: string, limit = 100): Promise<AuditLog[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).action, action))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .orderBy(desc((this.table as any).at))
      .limit(limit);

    return results as AuditLog[];
  }
}

