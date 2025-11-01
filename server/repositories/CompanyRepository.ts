import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { Company, InsertCompany } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Repository for Company entity
 */
export class CompanyRepository extends BaseRepository<Company, InsertCompany> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.company);
  }

  /**
   * Get company with employee count (optimized with single query using JOIN)
   */
  async findByIdWithStats(id: string): Promise<(Company & { employeeCount: number }) | undefined> {
    const result = await this.db
      .select({
        company: this.table,
        employeeCount: sql<number>`count(${schema.employee.id})`.as('employee_count'),
      })
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .leftJoin(schema.employee, eq(schema.employee.company_id, (this.table as any).id))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(eq((this.table as any).id, id))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .groupBy((this.table as any).id)
      .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].company,
      employeeCount: Number(result[0].employeeCount || 0),
    } as Company & { employeeCount: number };
  }

  /**
   * Get all companies with pagination
   */
  async findAllPaginated(page: number = 1, limit: number = 20): Promise<{
    data: Company[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(this.table)
        .limit(limit)
        .offset(offset),
      this.count(),
    ]);

    return {
      data: data as Company[],
      total: totalResult,
      page,
      totalPages: Math.ceil(totalResult / limit),
    };
  }

  /**
   * Search companies by name
   */
  async searchByName(query: string): Promise<Company[]> {
    const results = await this.db
      .select()
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      .where(sql`${(this.table as any).name} ILIKE ${`%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`}`);

    return results as Company[];
  }
}

