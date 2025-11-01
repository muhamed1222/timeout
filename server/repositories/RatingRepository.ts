import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { 
  EmployeeRating, 
  InsertEmployeeRating,
  Violations,
  InsertViolations,
  CompanyViolationRules,
  InsertCompanyViolationRules,
  Employee
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { ViolationRepository } from './ViolationRepository.js';
import type { EmployeeRepository } from './EmployeeRepository.js';

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
    // Convert Date to YYYY-MM-DD string format for date column
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const results = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(schema.employee_rating.employee_id, employeeId),
          gte(schema.employee_rating.period_start, startDateStr as any),
          lte(schema.employee_rating.period_end, endDateStr as any)
        )
      )
      .limit(1);

    return results[0] as EmployeeRating | undefined;
  }

  /**
   * Find ratings by company
   */
  async findByCompanyId(companyId: string, periodStart?: Date, periodEnd?: Date): Promise<EmployeeRating[]> {
    const whereExpr = (periodStart && periodEnd)
      ? and(
          eq(schema.employee_rating.company_id, companyId),
          eq(schema.employee_rating.period_start, periodStart.toISOString().split('T')[0] as any),
          eq(schema.employee_rating.period_end, periodEnd.toISOString().split('T')[0] as any)
        )
      : eq(schema.employee_rating.company_id, companyId);

    const results = await this.db
      .select()
      .from(this.table)
      .where(whereExpr)
      .orderBy(desc(schema.employee_rating.rating));

    return results as EmployeeRating[];
  }

  /**
   * Get top rated employees
   */
  async getTopRated(companyId: string, limit: number = 10): Promise<(EmployeeRating & { employee: Employee })[]> {
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

    return results.map((row) => ({
      ...row.employee_rating,
      employee: row.employee,
    })) as (EmployeeRating & { employee: Employee })[];
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
    return results.map((row) => row.violation) as Violations[];
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

  /**
   * Calculate rating from violations and update/create employee rating
   * This method contains business logic and requires access to violations
   */
  async updateFromViolations(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    violationRepo: ViolationRepository,
    employeeRepo: EmployeeRepository
  ): Promise<EmployeeRating> {
    // Calculate rating from violations
    const violations = await violationRepo.findViolationsByEmployee(employeeId, periodStart, periodEnd);
    const totalPenalty = violations.reduce((sum: number, violation: Violations) => sum + Number(violation.penalty || 0), 0);
    const rating = Math.max(0, 100 - totalPenalty);

    // Get or create employee rating
    let employeeRating = await this.findByEmployeeAndPeriod(employeeId, periodStart, periodEnd);

    if (employeeRating) {
      employeeRating = await this.update(employeeRating.id, { 
        rating: rating.toString(),
        status: rating <= 30 ? 'terminated' : rating <= 50 ? 'warning' : 'active'
      } as any);
    } else {
      // Get employee to get company_id
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      employeeRating = await this.create({
        employee_id: employeeId,
        company_id: employee.company_id,
        period_start: periodStart.toISOString().split('T')[0] as any,
        period_end: periodEnd.toISOString().split('T')[0] as any,
        rating: rating.toString(),
        status: rating <= 30 ? 'terminated' : rating <= 50 ? 'warning' : 'active'
      } as any);
    }

    // Update employee status if rating is too low
    if (rating <= 30) {
      await employeeRepo.update(employeeId, { 
        status: 'terminated'
      } as any);
    }

    return employeeRating!;
  }
}

