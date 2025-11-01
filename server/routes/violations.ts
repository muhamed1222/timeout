import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { ForbiddenError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody } from "../middleware/validate.js";
import { createViolationSchema } from "../lib/schemas/index.js";
import { findOrThrow, validateCompanyScope, invalidateCompanyStatsByEmployeeId, getCurrentMonthPeriod } from "../lib/utils/index.js";
import { violationsCounter } from "../lib/metrics.js";

const router = Router();

router.post('/', validateBody(createViolationSchema), asyncHandler(async (req, res) => {
  const validatedData = req.body;

  const employee = await findOrThrow(
    () => repositories.employee.findById(validatedData.employee_id),
    'Employee'
  );
  
  const rule = await findOrThrow(
    () => repositories.violation.findById(validatedData.rule_id),
    'Violation rule'
  );
  
  validateCompanyScope(employee.company_id, validatedData.company_id, 'Employee company mismatch');
  validateCompanyScope(rule.company_id, validatedData.company_id, 'Rule company mismatch');
  
  await findOrThrow(
    () => repositories.company.findById(validatedData.company_id),
    'Company'
  );

  const violation = await repositories.violation.createViolation({
    employee_id: validatedData.employee_id,
    company_id: validatedData.company_id,
    rule_id: validatedData.rule_id,
    source: validatedData.source,
    reason: validatedData.reason,
    created_by: validatedData.created_by,
    penalty: rule.penalty_percent,
  } as any);

  // Track violation in Prometheus metrics
  violationsCounter.labels(
    validatedData.type || 'other',
    String(rule.penalty_percent || 0),
    validatedData.source || 'manual'
  ).inc();

  // Update rating for current month
  const { start: periodStart, end: periodEnd } = getCurrentMonthPeriod();
  await repositories.rating.updateFromViolations(
    violation.employee_id,
    periodStart,
    periodEnd,
    repositories.violation,
    repositories.employee
  );

  await invalidateCompanyStatsByEmployeeId(violation.employee_id);

  res.json(violation);
}));

export default router;


