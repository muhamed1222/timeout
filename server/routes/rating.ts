import { Router } from "express";
import { z } from "zod";
import { repositories } from "../repositories/index.js";
import { insertCompanyViolationRulesSchema, insertViolationsSchema } from "../../shared/schema.js";
import type { EmployeeRating, InsertEmployeeRating, InsertCompanyViolationRules } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";
import { invalidateCompanyStats, getCurrentMonthPeriod } from "../lib/utils/index.js";
import { asyncHandler, NotFoundError, ValidationError } from "../lib/errorHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { companyIdInParamsSchema } from "../lib/schemas/companies.schemas.js";
import { employeeIdInParamsSchema } from "../lib/schemas/employees.schemas.js";
import { violationRuleIdParamSchema, createViolationRuleSchema, updateViolationRuleSchema } from "../lib/schemas/violations.schemas.js";
import { dateRangeQuerySchema, adjustRatingBodySchema, recalculateRatingBodySchema } from "../lib/schemas/common.schemas.js";

const router = Router();

// Rating periods for UI
router.get("/periods", asyncHandler(async (_req, res) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 12, 0);

  const toYmd = (d: Date) => d.toISOString().split('T')[0];

  const periods = [
    { id: 'current', name: 'Текущий месяц', start_date: toYmd(currentMonthStart), end_date: toYmd(currentMonthEnd) },
    { id: 'last', name: 'Прошлый месяц', start_date: toYmd(lastMonthStart), end_date: toYmd(lastMonthEnd) },
    { id: 'quarter', name: 'Квартал', start_date: toYmd(quarterStart), end_date: toYmd(quarterEnd) },
    { id: 'year', name: 'Год', start_date: toYmd(yearStart), end_date: toYmd(yearEnd) },
  ];

  res.json(periods);
}));

// Get violation rules by company
router.get("/companies/:companyId/rules", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await repositories.company.findById(companyId);
  if (!company) {
    throw new NotFoundError("Company");
  }
  const rules = await repositories.violation.findByCompanyId(companyId);
  res.json(rules);
}));

// Create violation rule
router.post("/rules", validateBody(createViolationRuleSchema), asyncHandler(async (req, res) => {
  const validatedData = req.body;
  const company = await repositories.company.findById(validatedData.company_id);
  if (!company) {
    throw new NotFoundError("Company");
  }
  const existing = await repositories.violation.findByCompanyId(validatedData.company_id);
  const duplicate = existing.find(r => r.code.trim().toLowerCase() === validatedData.code.trim().toLowerCase());
  if (duplicate) {
    throw new ValidationError("Rule code must be unique within the company");
  }
  const rule = await repositories.violation.create(validatedData as InsertCompanyViolationRules);
  res.json(rule);
}));

// Update violation rule
router.put("/rules/:id", validateParams(violationRuleIdParamSchema), validateBody(updateViolationRuleSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validatedData = req.body;
  if (validatedData.code || validatedData.company_id) {
    const current = await repositories.violation.findById(id);
    if (!current) throw new NotFoundError("Violation rule");
    const companyId = validatedData.company_id || current.company_id;
    const company = await repositories.company.findById(companyId);
    if (!company) {
      throw new NotFoundError("Company");
    }
    const codeToCheck = (validatedData.code || current.code).trim().toLowerCase();
    const existing = await repositories.violation.findByCompanyId(companyId);
    const duplicate = existing.find(r => r.id !== id && r.code.trim().toLowerCase() === codeToCheck);
    if (duplicate) {
      throw new ValidationError("Rule code must be unique within the company");
    }
  }
  const rule = await repositories.violation.update(id, validatedData as Partial<InsertCompanyViolationRules>);
  if (!rule) {
    throw new NotFoundError("Violation rule");
  }
  res.json(rule);
}));

// Delete violation rule
router.delete("/rules/:id", validateParams(violationRuleIdParamSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const current = await repositories.violation.findById(id);
  if (!current) {
    throw new NotFoundError("Violation rule");
  }
  await repositories.violation.delete(id);
  res.json({ message: "Violation rule deleted successfully" });
}));

// Create violation
router.post("/violations", validateBody(z.object({
  employee_id: z.string().uuid(),
  company_id: z.string().uuid(),
  rule_id: z.string().uuid(),
  source: z.enum(['manual', 'auto']).default('manual'),
  reason: z.string().optional(),
  created_by: z.string().uuid().optional()
})), asyncHandler(async (req, res) => {
  const validatedData = req.body;
  
  const employee = await repositories.employee.findById(validatedData.employee_id);
  if (!employee) throw new NotFoundError('Employee');
  const rule = await repositories.violation.findById(validatedData.rule_id);
  if (!rule) throw new NotFoundError('Violation rule');
  if (employee.company_id !== validatedData.company_id || rule.company_id !== validatedData.company_id) {
    throw new ValidationError('Company scope mismatch');
  }
  const company = await repositories.company.findById(validatedData.company_id);
  if (!company) throw new NotFoundError('Company');
    
    // Convert penalty_percent to string (PostgreSQL numeric requires string)
    const penaltyValue = rule.penalty_percent ? String(rule.penalty_percent) : '0';
    const violation = await repositories.violation.createViolation({
      employee_id: validatedData.employee_id,
      company_id: validatedData.company_id,
      rule_id: validatedData.rule_id,
      source: validatedData.source,
      reason: validatedData.reason,
      created_by: validatedData.created_by,
      penalty: penaltyValue,
    } as any);
    
      // Adjust rating decrementally by penalty for the current period
      const employeeAfter = await repositories.employee.findById(violation.employee_id);
      if (employeeAfter) {
        const { start: periodStart, end: periodEnd } = getCurrentMonthPeriod();

      const existing = await repositories.rating.findByEmployeeAndPeriod(violation.employee_id, periodStart, periodEnd);
      const currentValue = existing ? Number(existing.rating) : 100;
      const penalty = Number(violation.penalty || 0);
      const newValue = Math.max(0, currentValue - penalty);

      if (existing) {
        await repositories.rating.update(existing.id, { rating: String(newValue) } as Partial<InsertEmployeeRating>);
      } else {
        await repositories.rating.create({
          employee_id: violation.employee_id,
          company_id: employeeAfter.company_id,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          rating: String(newValue),
          status: newValue <= 30 ? 'terminated' : newValue <= 50 ? 'warning' : 'active'
        } as InsertEmployeeRating);
      }

      // Invalidate company stats cache so "Нарушения" обновились
      await invalidateCompanyStats(employeeAfter.company_id);
    }
    
    res.json(violation);
}));

// Get employee violations
router.get("/employees/:employeeId/violations", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { periodStart, periodEnd } = req.query;
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart as string);
      endDate = new Date(periodEnd as string);
    }
    
    const violations = await repositories.violation.findViolationsByEmployee(employeeId, startDate, endDate);
    res.json(violations);
  } catch (error) {
    logger.error("Error fetching violations", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get company ratings
router.get("/companies/:companyId/ratings", validateParams(companyIdInParamsSchema), validateQuery(dateRangeQuerySchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { periodStart, periodEnd } = req.query;
  
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (periodStart && periodEnd) {
    startDate = new Date(periodStart as string);
    endDate = new Date(periodEnd as string);
  }
  
  const ratings = await repositories.rating.findByCompanyId(companyId, startDate, endDate);
  
  // Transform to format expected by frontend: { employee_id, rating }
  // rating is numeric (string) from PostgreSQL, convert to number
  const transformedRatings = ratings.map((r: EmployeeRating) => ({
    employee_id: r.employee_id,
    rating: Number(r.rating || 100) // Convert numeric string to number, default to 100
  }));
  
  res.json(transformedRatings);
}));

// Recalculate company ratings
router.post("/companies/:companyId/recalculate", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const employees = await repositories.employee.findByCompanyId(companyId);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const results: Array<{ employee_id: string; rating: number }> = [];
  for (const emp of employees) {
    const ratingRecord = await repositories.rating.updateFromViolations(emp.id, periodStart, periodEnd, repositories.violation, repositories.employee);
    results.push({ employee_id: emp.id, rating: Number(ratingRecord.rating) });
  }

  res.json({ message: 'Пересчет завершен', count: results.length });
}));

// Global rating recalculation
router.post("/recalculate", validateBody(recalculateRatingBodySchema), asyncHandler(async (req, res) => {
  const { periodStart, periodEnd } = req.body || {};
  const now = new Date();
  const start = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = periodEnd ? new Date(periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Optimize: Load all employees at once to avoid N+1 queries
  const companies = await repositories.company.findAll();
  const companyIds = companies.map(c => c.id);
  
  // Load all employees for all companies in parallel
  const employeesPromises = companyIds.map(companyId => 
    repositories.employee.findByCompanyId(companyId)
  );
  const employeesArrays = await Promise.all(employeesPromises);
  const allEmployees = employeesArrays.flat();
  
  // Process all employees in parallel batches
  const batchSize = 50;
  let processed = 0;
  for (let i = 0; i < allEmployees.length; i += batchSize) {
    const batch = allEmployees.slice(i, i + batchSize);
    await Promise.all(
      batch.map(emp => 
        repositories.rating.updateFromViolations(emp.id, start, end, repositories.violation, repositories.employee)
      )
    );
    processed += batch.length;
  }

  res.json({ message: 'Глобальный пересчет завершен', processed, periodStart: start.toISOString().split('T')[0], periodEnd: end.toISOString().split('T')[0] });
}));

// Get employee rating
router.get("/employees/:employeeId", validateParams(employeeIdInParamsSchema), validateQuery(dateRangeQuerySchema.extend({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})), asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { periodStart, periodEnd } = req.query;
  
  const startDate = new Date(typeof periodStart === 'string' ? periodStart : String(periodStart));
  const endDate = new Date(typeof periodEnd === 'string' ? periodEnd : String(periodEnd));
  
  const rating = await repositories.rating.findByEmployeeAndPeriod(employeeId, startDate, endDate);
  if (!rating) {
    throw new NotFoundError("Rating");
  }
  
  res.json(rating);
}));

// Recalculate employee rating
router.post("/employees/:employeeId/recalculate", validateParams(employeeIdInParamsSchema), validateBody(dateRangeQuerySchema.extend({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})), asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { periodStart, periodEnd } = req.body;
  
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  
  const rating = await repositories.rating.updateFromViolations(employeeId, startDate, endDate, repositories.violation, repositories.employee);
  res.json(rating);
}));

// Adjust employee rating by delta (e.g., +5 to increase)
router.post("/employees/:employeeId/adjust", validateParams(employeeIdInParamsSchema), validateBody(adjustRatingBodySchema), asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { delta, periodStart, periodEnd } = req.body;

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const employee = await repositories.employee.findById(employeeId);
  if (!employee) throw new NotFoundError('Employee');

  // Get or create rating for the period
  const existing = await repositories.rating.findByEmployeeAndPeriod(employeeId, startDate, endDate);
  const current = existing ? Number(existing.rating) : 100;
  const updatedValue = Math.max(0, Math.min(100, current + delta));

  if (existing) {
    const updated = await repositories.rating.update(existing.id, { rating: String(updatedValue) } as Partial<InsertEmployeeRating>);
    return res.json(updated);
  } else {
    const created = await repositories.rating.create({
      employee_id: employeeId,
      company_id: employee.company_id,
      period_start: periodStart,
      period_end: periodEnd,
      rating: String(updatedValue),
      status: updatedValue <= 30 ? 'terminated' : updatedValue <= 50 ? 'warning' : 'active'
    } as InsertEmployeeRating);
    return res.json(created);
  }
}));

export default router;

