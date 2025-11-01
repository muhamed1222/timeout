import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { 
  CompanyViolationRules, 
  InsertCompanyViolationRules,
  Violations,
  InsertViolations
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Repository for Violation Rules and Violations
 */
export class ViolationRepository extends BaseRepository<CompanyViolationRules, InsertCompanyViolationRules> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.company_violation_rules);
  }

  /**
   * Find violation rules by company ID
   */
  async findByCompanyId(companyId: string): Promise<CompanyViolationRules[]> {
    const results = await this.db
      .select()
      .from(schema.company_violation_rules)
      .where(eq(schema.company_violation_rules.company_id, companyId))
      .orderBy(schema.company_violation_rules.name);

    return results as CompanyViolationRules[];
  }

  /**
   * Find active violation rules by company ID
   */
  async findActiveByCompanyId(companyId: string): Promise<CompanyViolationRules[]> {
    const results = await this.db
      .select()
      .from(schema.company_violation_rules)
      .where(
        and(
          eq(schema.company_violation_rules.company_id, companyId),
          eq(schema.company_violation_rules.is_active, true)
        )
      )
      .orderBy(schema.company_violation_rules.name);

    return results as CompanyViolationRules[];
  }

  /**
   * Find violation rule by code and company ID
   */
  async findByCode(companyId: string, code: string): Promise<CompanyViolationRules | undefined> {
    const results = await this.db
      .select()
      .from(schema.company_violation_rules)
      .where(
        and(
          eq(schema.company_violation_rules.company_id, companyId),
          eq(schema.company_violation_rules.code, code)
        )
      )
      .limit(1);

    return results[0] as CompanyViolationRules | undefined;
  }

  /**
   * Create a violation
   */
  async createViolation(violation: InsertViolations): Promise<Violations> {
    const results = await this.db
      .insert(schema.violations)
      .values(violation as any)
      .returning();

    return results[0] as Violations;
  }

  /**
   * Find violations by employee ID
   */
  async findViolationsByEmployee(
    employeeId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<Violations[]> {
    const whereExpr = (periodStart && periodEnd)
      ? and(
          eq(schema.violations.employee_id, employeeId),
          gte(schema.violations.created_at, periodStart),
          lte(schema.violations.created_at, periodEnd)
        )
      : eq(schema.violations.employee_id, employeeId);

    const results = await this.db
      .select()
      .from(schema.violations)
      .where(whereExpr)
      .orderBy(desc(schema.violations.created_at));

    return results as Violations[];
  }

  /**
   * Find violations by company ID
   */
  async findViolationsByCompany(
    companyId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<Violations[]> {
    const whereExpr = (periodStart && periodEnd)
      ? and(
          eq(schema.violations.company_id, companyId),
          gte(schema.violations.created_at, periodStart),
          lte(schema.violations.created_at, periodEnd)
        )
      : eq(schema.violations.company_id, companyId);

    const results = await this.db
      .select()
      .from(schema.violations)
      .where(whereExpr)
      .orderBy(desc(schema.violations.created_at));

    return results as Violations[];
  }

  /**
   * Find violation by ID
   */
  async findViolationById(id: string): Promise<Violations | undefined> {
    const results = await this.db
      .select()
      .from(schema.violations)
      .where(eq(schema.violations.id, id))
      .limit(1);

    return results[0] as Violations | undefined;
  }

  /**
   * Calculate total penalty for employee violations in period
   */
  async calculateTotalPenalty(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const violations = await this.findViolationsByEmployee(employeeId, periodStart, periodEnd);
    return violations.reduce((sum, violation) => sum + Number(violation.penalty), 0);
  }
}

