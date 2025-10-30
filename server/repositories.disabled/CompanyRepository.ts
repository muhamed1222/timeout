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
   * Get company with employee count
   */
  async findByIdWithStats(id: string): Promise<(Company & { employeeCount: number }) | undefined> {
    const company = await this.findById(id);
    if (!company) return undefined;

    const employeeCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.employee)
      .where(eq(schema.employee.company_id, id));

    return {
      ...company,
      employeeCount: Number(employeeCount[0]?.count || 0),
    };
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
      .where(sql`${this.table.name} ILIKE ${`%${query}%`}`);

    return results as Company[];
  }
}

