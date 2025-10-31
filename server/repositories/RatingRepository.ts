import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { 
  EmployeeRating, 
  InsertEmployeeRating,
  Violations,
  InsertViolations,
  CompanyViolationRules,
  InsertCompanyViolationRules
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Repository for Rating and Violations entities
 */
export class RatingRepository extends BaseRepository<EmployeeRating, InsertEmployeeRating> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.employee_rating);
  }

  /**
   * Find rating by employee and period
   */
  async findByEmployeeAndPeriod(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeRating | undefined> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.employee_rating.employee_id, employeeId),
          gte(schema.employee_rating.period_start, startDate as any),
          lte(schema.employee_rating.period_end, endDate as any)
        )
      )
      .limit(1);

    return results[0] as EmployeeRating | undefined;
  }

  /**
   * Find ratings by company
   */
  async findByCompanyId(companyId: string, limit?: number): Promise<EmployeeRating[]> {
    let query = this.db
      .select({
        rating: this.table,
      })
      .from(this.table)
      .innerJoin(
        schema.employee,
        eq(schema.employee_rating.employee_id, schema.employee.id)
      )
      .where(eq(schema.employee.company_id, companyId))
      .orderBy(desc(schema.employee_rating.rating));

    const results = limit ? await query.limit(limit) : await query;
    return results.map((row: any) => row.rating) as EmployeeRating[];
  }

  /**
   * Get top rated employees
   */
  async getTopRated(companyId: string, limit: number = 10): Promise<(EmployeeRating & { employee: any })[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .innerJoin(
        schema.employee,
        eq(schema.employee_rating.employee_id, schema.employee.id)
      )
      .where(eq(schema.employee.company_id, companyId))
      .orderBy(desc(schema.employee_rating.rating))
      .limit(limit);

    return results.map((row: any) => ({
      ...row.employee_rating,
      employee: row.employee,
    }));
  }

  /**
   * Calculate average rating for company
   */
  async getAverageRating(companyId: string): Promise<number> {
    const result = await this.db
      .select({ 
        avg: sql<number>`AVG(${schema.employee_rating.rating})` 
      })
      .from(this.table)
      .innerJoin(
        schema.employee,
        eq(schema.employee_rating.employee_id, schema.employee.id)
      )
      .where(eq(schema.employee.company_id, companyId));

    return Number(result[0]?.avg || 0);
  }

  // Violations methods
  
  /**
   * Create violation
   */
  async createViolation(violation: InsertViolations): Promise<Violations> {
    const results = await this.db
      .insert(schema.violations)
      .values(violation)
      .returning();

    return results[0] as Violations;
  }

  /**
   * Find violations by employee
   */
  async findViolationsByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Violations[]> {
    const conditions = [eq(schema.violations.employee_id, employeeId)];

    if (startDate) {
      conditions.push(gte(schema.violations.created_at, startDate as any));
    }
    if (endDate) {
      conditions.push(lte(schema.violations.created_at, endDate as any));
    }

    const results = await this.db
      .select()
      .from(schema.violations)
      .where(and(...conditions))
      .orderBy(desc(schema.violations.created_at));

    return results as Violations[];
  }

  /**
   * Find violations by company
   */
  async findViolationsByCompany(companyId: string, limit?: number): Promise<Violations[]> {
    let query = this.db
      .select({
        violation: schema.violations,
      })
      .from(schema.violations)
      .innerJoin(
        schema.employee,
        eq(schema.violations.employee_id, schema.employee.id)
      )
      .where(eq(schema.employee.company_id, companyId))
      .orderBy(desc(schema.violations.created_at));

    const results = limit ? await query.limit(limit) : await query;
    return results.map((row: any) => row.violation) as Violations[];
  }

  /**
   * Count violations by employee
   */
  async countViolationsByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const conditions = [eq(schema.violations.employee_id, employeeId)];

    if (startDate) {
      conditions.push(gte(schema.violations.created_at, startDate as any));
    }
    if (endDate) {
      conditions.push(lte(schema.violations.created_at, endDate as any));
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.violations)
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }

  // Violation Rules methods

  /**
   * Create violation rule
   */
  async createViolationRule(rule: InsertCompanyViolationRules): Promise<CompanyViolationRules> {
    const results = await this.db
      .insert(schema.company_violation_rules)
      .values(rule)
      .returning();

    return results[0] as CompanyViolationRules;
  }

  /**
   * Find violation rules by company
   */
  async findViolationRulesByCompany(companyId: string): Promise<CompanyViolationRules[]> {
    const results = await this.db
      .select()
      .from(schema.company_violation_rules)
      .where(eq(schema.company_violation_rules.company_id, companyId));

    return results as CompanyViolationRules[];
  }

  /**
   * Find active violation rules by company
   */
  async findActiveViolationRulesByCompany(companyId: string): Promise<CompanyViolationRules[]> {
    const results = await this.db
      .select()
      .from(schema.company_violation_rules)
      .where(
        and(
          eq(schema.company_violation_rules.company_id, companyId),
          eq(schema.company_violation_rules.is_active, true)
        )
      );

    return results as CompanyViolationRules[];
  }

  /**
   * Update violation rule
   */
  async updateViolationRule(
    id: string,
    updates: Partial<InsertCompanyViolationRules>
  ): Promise<CompanyViolationRules | undefined> {
    const results = await this.db
      .update(schema.company_violation_rules)
      .set(updates)
      .where(eq(schema.company_violation_rules.id, id))
      .returning();

    return results[0] as CompanyViolationRules | undefined;
  }

  /**
   * Delete violation rule
   */
  async deleteViolationRule(id: string): Promise<void> {
    await this.db
      .delete(schema.company_violation_rules)
      .where(eq(schema.company_violation_rules.id, id));
  }
}

