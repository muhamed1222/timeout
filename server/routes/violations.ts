import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { asyncHandler } from "../lib/errorHandler.js";
import { validateBody } from "../middleware/validate.js";
import { createViolationSchema } from "../lib/schemas/index.js";
import { findOrThrow, validateCompanyScope, invalidateCompanyStatsByEmployeeId, getCurrentMonthPeriod } from "../lib/utils/index.js";
import { violationsCounter } from "../lib/metrics.js";

const router = Router();

router.post('/', validateBody(createViolationSchema), asyncHandler(async (req, res) => {
  const validatedData = req.body;

  void logger.info('Creating violation', {
    employeeId: validatedData.employee_id,
    companyId: validatedData.company_id,
    ruleId: validatedData.rule_id,
    source: validatedData.source
  });

  try {
    const employee = await findOrThrow(
      () => repositories.employee.findById(validatedData.employee_id),
      'Employee'
    );
    
    const rule = await findOrThrow(
      () => repositories.violation.findById(validatedData.rule_id),
      'Violation rule'
    );
    
    void logger.info('Found employee and rule', {
      employeeCompanyId: employee.company_id,
      ruleCompanyId: rule.company_id,
      rulePenalty: rule.penalty_percent
    });
    
    validateCompanyScope(employee.company_id, validatedData.company_id, 'Employee company mismatch');
    validateCompanyScope(rule.company_id, validatedData.company_id, 'Rule company mismatch');
    
    await findOrThrow(
      () => repositories.company.findById(validatedData.company_id),
      'Company'
    );

    // Convert penalty_percent to string (PostgreSQL numeric requires string)
    // penalty_percent is already a string from PostgreSQL numeric type, but ensure it's valid
    let penaltyValue: string;
    if (rule.penalty_percent === null || rule.penalty_percent === undefined) {
      penaltyValue = '0';
    } else if (typeof rule.penalty_percent === 'number') {
      penaltyValue = rule.penalty_percent.toString();
    } else {
      penaltyValue = String(rule.penalty_percent);
    }
    void logger.info('Creating violation with penalty', { penalty: penaltyValue, originalType: typeof rule.penalty_percent, originalValue: rule.penalty_percent });

    // Prepare violation data
    const violationData: any = {
      employee_id: validatedData.employee_id,
      company_id: validatedData.company_id,
      rule_id: validatedData.rule_id,
      source: validatedData.source ?? 'manual',
      penalty: penaltyValue,
    };

    // Add optional fields only if they have values
    if (validatedData.reason && validatedData.reason.trim()) {
      violationData.reason = validatedData.reason.trim();
    }

    if (validatedData.created_by) {
      violationData.created_by = validatedData.created_by;
    }

    void logger.info('Violation data prepared', { 
      hasReason: !!violationData.reason,
      hasCreatedBy: !!violationData.created_by,
      penalty: violationData.penalty
    });

    const violation = await repositories.violation.createViolation(violationData);

    void logger.info('Violation created', { violationId: violation.id });

    // Track violation in Prometheus metrics
    try {
      violationsCounter.labels(
        rule.code ?? 'other',
        String(rule.penalty_percent ?? 0),
        validatedData.source ?? 'manual'
      ).inc();
    } catch (error) {
      logger.error('Error tracking violation metrics', { error });
    }

    // Update rating for current month
    try {
      const { start: periodStart, end: periodEnd } = getCurrentMonthPeriod();
      void logger.info('Updating rating', { periodStart, periodEnd, employeeId: violation.employee_id });
      await repositories.rating.updateFromViolations(
        violation.employee_id,
        periodStart,
        periodEnd,
        repositories.violation,
        repositories.employee
      );
      void logger.info('Rating updated successfully');
    } catch (error) {
      logger.error('Error updating rating from violations', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        violationId: violation.id 
      });
      // Continue execution even if rating update fails
    }

    try {
      await invalidateCompanyStatsByEmployeeId(violation.employee_id);
    } catch (error) {
      logger.error('Error invalidating cache', { error });
    }

    void logger.info('Violation creation completed successfully', { violationId: violation.id });
    res.json(violation);
  } catch (error) {
    logger.error('Error in violation creation', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      validatedData
    });
    throw error; // Re-throw to let asyncHandler handle it
  }
}));

export default router;


