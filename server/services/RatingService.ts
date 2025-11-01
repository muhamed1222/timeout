/**
 * RatingService - Business logic for rating and violation management
 */

import type { DIContainer } from "../lib/di/container.js";
import { getContainer } from "../lib/di/container.js";
import { logger } from "../lib/logger.js";
import type { InsertViolations, InsertCompanyViolationRules } from "../../shared/schema.js";

export class RatingService {
  constructor(private readonly container: DIContainer) {}

  private get repositories() {
    return this.container.repositories;
  }

  /**
   * Create a violation rule for a company
   */
  async createViolationRule(data: InsertCompanyViolationRules) {
    try {
      // Check for duplicate code in company
      const existingRules = await this.repositories.violation.findByCompanyId(data.company_id);
      const duplicate = existingRules.find((rule: any) => rule.code === data.code);
      
      if (duplicate) {
        throw new Error(`Violation rule with code '${data.code}' already exists`);
      }

      const rule = await this.repositories.violation.create(data);
      
      logger.info("Violation rule created", { 
        ruleId: rule.id, 
        companyId: data.company_id,
        code: data.code 
      });
      
      return rule;
    } catch (error) {
      logger.error("Failed to create violation rule", error);
      throw error;
    }
  }

  /**
   * Get violation rules for a company
   */
  async getViolationRules(companyId: string) {
    try {
      const rules = await this.repositories.violation.findByCompanyId(companyId);
      
      logger.debug("Violation rules fetched", { companyId, count: rules.length });
      
      return rules;
    } catch (error) {
      logger.error("Failed to get violation rules", error);
      throw error;
    }
  }

  /**
   * Update a violation rule
   */
  async updateViolationRule(ruleId: string, data: Partial<InsertCompanyViolationRules>) {
    try {
      const rule = await this.repositories.violation.update(ruleId, data);
      
      logger.info("Violation rule updated", { ruleId });
      
      return rule;
    } catch (error) {
      logger.error("Failed to update violation rule", error);
      throw error;
    }
  }

  /**
   * Delete a violation rule
   */
  async deleteViolationRule(ruleId: string) {
    try {
      await this.repositories.violation.delete(ruleId);
      
      logger.info("Violation rule deleted", { ruleId });
      
      return true;
    } catch (error) {
      logger.error("Failed to delete violation rule", error);
      throw error;
    }
  }

  /**
   * Create a violation and trigger rating recalculation
   */
  async createViolation(data: InsertViolations) {
    try {
      const violation = await this.repositories.violation.createViolation(data);
      
      // Recalculate rating for the current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      await this.recalculateEmployeeRating(
        data.employee_id,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0]
      );
      
      logger.info("Violation created", { 
        violationId: violation.id, 
        employeeId: data.employee_id,
        ruleId: data.rule_id,
        source: data.source 
      });
      
      return violation;
    } catch (error) {
      logger.error("Failed to create violation", error);
      throw error;
    }
  }

  /**
   * Get violations for an employee
   */
  async getViolationsByEmployee(employeeId: string, periodStart?: string, periodEnd?: string) {
    try {
      const allViolations = await this.repositories.violation.findViolationsByEmployee(employeeId);
      
      let violations = allViolations;
      
      if (periodStart && periodEnd) {
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        
        violations = allViolations.filter(v => {
          if (!v.created_at) return false;
          const date = new Date(v.created_at);
          return date >= start && date <= end;
        });
      }
      
      logger.debug("Violations fetched", { 
        employeeId, 
        count: violations.length,
        periodStart,
        periodEnd 
      });
      
      return violations;
    } catch (error) {
      logger.error("Failed to get violations", error);
      throw error;
    }
  }

  /**
   * Calculate rating for an employee in a period
   */
  async recalculateEmployeeRating(
    employeeId: string,
    periodStart: string,
    periodEnd: string
  ) {
    try {
      const employee = await this.repositories.employee.findById(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Get violations in period
      const violations = await this.getViolationsByEmployee(employeeId, periodStart, periodEnd);
      
      // Get violation rules
      const rules = await this.repositories.violation.findByCompanyId(employee.company_id);
      const rulesMap = new Map(rules.map((r: any) => [r.id, r]));
      
      // Calculate total penalty
      let totalPenalty = 0;
      for (const violation of violations) {
        const rule: any = rulesMap.get(violation.rule_id);
        if (rule && rule.is_active) {
          totalPenalty += Number(rule.penalty_percent);
        }
      }
      
      // Rating = 100% - total penalties, but not less than 0%
      const rating = Math.max(0, 100 - totalPenalty);
      
      // Check if employee should be blocked (rating <= 30%)
      const isBlocked = rating <= 30;
      
      // Update or create rating record
      const existingRating = await this.repositories.rating.findByEmployeeAndPeriod(employeeId, new Date(periodStart), new Date(periodEnd));
      
      const status = rating >= 80 ? 'active' : rating >= 50 ? 'warning' : 'terminated';
      
      if (existingRating) {
        await this.repositories.rating.update(existingRating.id, {
          rating: rating.toString(),
          status
        });
      } else {
        await this.repositories.rating.create({
          employee_id: employeeId,
          company_id: employee.company_id,
          period_start: periodStart,
          period_end: periodEnd,
          rating: rating.toString(),
          status
        });
      }
      
      // Update employee status if critical
      if (isBlocked && employee.status !== 'terminated') {
        await this.repositories.employee.update(employeeId, { status: 'terminated' } as any);
      }
      
      logger.info("Rating recalculated", { 
        employeeId, 
        periodStart,
        periodEnd,
        rating,
        violationsCount: violations.length,
        isBlocked 
      });
      
      return { rating, violationsCount: violations.length, isBlocked };
    } catch (error) {
      logger.error("Failed to recalculate employee rating", error);
      throw error;
    }
  }

  /**
   * Recalculate ratings for all employees in a company
   */
  async recalculateCompanyRatings(
    companyId: string,
    periodStart?: string,
    periodEnd?: string
  ) {
    try {
      const now = new Date();
      const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const employees = await this.repositories.employee.findByCompanyId(companyId);
      
      const results = [];
      for (const employee of employees) {
        const result = await this.recalculateEmployeeRating(employee.id, start, end);
        results.push({ employeeId: employee.id, ...result });
      }
      
      logger.info("Company ratings recalculated", { 
        companyId, 
        periodStart: start,
        periodEnd: end,
        employeesProcessed: results.length 
      });
      
      return results;
    } catch (error) {
      logger.error("Failed to recalculate company ratings", error);
      throw error;
    }
  }

  /**
   * Get ratings for a company in a period
   */
  async getCompanyRatings(companyId: string, periodStart: string, periodEnd: string) {
    try {
      const employees = await this.repositories.employee.findByCompanyId(companyId);
      const ratings = [];
      
      // Get ratings for each employee
      for (const employee of employees) {
        const rating = await this.repositories.rating.findByEmployeeAndPeriod(employee.id, new Date(periodStart), new Date(periodEnd));
        if (rating) {
          ratings.push({
            ...rating,
            employee: {
              full_name: employee.full_name,
              position: employee.position
            }
          });
        }
      }
      
      const enrichedRatings: any = ratings;
      
      logger.debug("Company ratings fetched", { 
        companyId, 
        periodStart,
        periodEnd,
        count: enrichedRatings.length 
      });
      
      return enrichedRatings;
    } catch (error) {
      logger.error("Failed to get company ratings", error);
      throw error;
    }
  }
}

// Singleton instance (backward compatibility)
export const ratingService = new RatingService(getContainer());

