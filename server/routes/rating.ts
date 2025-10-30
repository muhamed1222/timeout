import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { cache } from "../lib/cache.js";
import { insertCompanyViolationRulesSchema, insertViolationsSchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Rating periods for UI
router.get("/periods", async (_req, res) => {
  try {
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
  } catch (error) {
    logger.error('Error building rating periods', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get violation rules by company
router.get("/companies/:companyId/rules", async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    const rules = await storage.getViolationRulesByCompany(companyId);
    res.json(rules);
  } catch (error) {
    logger.error("Error fetching violation rules", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create violation rule
const requestCreateViolationRuleSchema = insertCompanyViolationRulesSchema.extend({
  penalty_percent: z.union([z.string(), z.number()]).transform((v) =>
    typeof v === 'number' ? v.toString() : v
  ),
});

router.post("/rules", async (req, res) => {
  try {
    const validatedData = requestCreateViolationRuleSchema.parse(req.body);
    const company = await storage.getCompany(validatedData.company_id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    const existing = await storage.getViolationRulesByCompany(validatedData.company_id);
    const duplicate = existing.find(r => r.code.trim().toLowerCase() === validatedData.code.trim().toLowerCase());
    if (duplicate) {
      return res.status(409).json({ error: "Rule code must be unique within the company" });
    }
    const rule = await storage.createViolationRule(validatedData as any);
    res.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update violation rule
const requestUpdateViolationRuleSchema = insertCompanyViolationRulesSchema.partial().extend({
  penalty_percent: z.union([z.string(), z.number()]).optional().transform((v) =>
    v === undefined ? v : (typeof v === 'number' ? v.toString() : v)
  ),
});

router.put("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = requestUpdateViolationRuleSchema.parse(req.body);
    if (validatedData.code || validatedData.company_id) {
      const current = await storage.getViolationRule(id);
      if (!current) return res.status(404).json({ error: "Violation rule not found" });
      const companyId = validatedData.company_id || current.company_id;
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      const codeToCheck = (validatedData.code || current.code).trim().toLowerCase();
      const existing = await storage.getViolationRulesByCompany(companyId);
      const duplicate = existing.find(r => r.id !== id && r.code.trim().toLowerCase() === codeToCheck);
      if (duplicate) {
        return res.status(409).json({ error: "Rule code must be unique within the company" });
      }
    }
    const rule = await storage.updateViolationRule(id, validatedData as any);
    if (!rule) {
      return res.status(404).json({ error: "Violation rule not found" });
    }
    res.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error updating violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete violation rule
router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const current = await storage.getViolationRule(id);
    if (!current) {
      return res.status(404).json({ error: "Violation rule not found" });
    }
    await storage.deleteViolationRule(id);
    res.json({ message: "Violation rule deleted successfully" });
  } catch (error) {
    logger.error("Error deleting violation rule", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create violation
router.post("/violations", async (req, res) => {
  try {
    const createViolationRequest = z.object({
      employee_id: z.string().uuid(),
      company_id: z.string().uuid(),
      rule_id: z.string().uuid(),
      source: z.enum(['manual', 'auto']).default('manual'),
      reason: z.string().optional(),
      created_by: z.string().uuid().optional()
    });
    const validatedData = createViolationRequest.parse(req.body);
    
    const employee = await storage.getEmployee(validatedData.employee_id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const rule = await storage.getViolationRule(validatedData.rule_id);
    if (!rule) return res.status(404).json({ error: 'Violation rule not found' });
    if (employee.company_id !== validatedData.company_id || rule.company_id !== validatedData.company_id) {
      return res.status(403).json({ error: 'Company scope mismatch' });
    }
    const company = await storage.getCompany(validatedData.company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    const violation = await storage.createViolation({
      employee_id: validatedData.employee_id,
      company_id: validatedData.company_id,
      rule_id: validatedData.rule_id,
      source: validatedData.source,
      reason: validatedData.reason,
      created_by: validatedData.created_by,
      penalty: rule.penalty_percent,
    } as any);
    
    // Adjust rating decrementally by penalty for the current period
    const employeeAfter = await storage.getEmployee(violation.employee_id);
    if (employeeAfter) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const existing = await storage.getEmployeeRating(violation.employee_id, periodStart, periodEnd);
      const currentValue = existing ? Number(existing.rating) : 100;
      const penalty = Number(violation.penalty || 0);
      const newValue = Math.max(0, currentValue - penalty);

      if (existing) {
        await storage.updateEmployeeRating(existing.id, { rating: String(newValue) } as any);
      } else {
        await storage.createEmployeeRating({
          employee_id: violation.employee_id,
          company_id: employeeAfter.company_id,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          rating: String(newValue),
          status: newValue <= 30 ? 'terminated' : newValue <= 50 ? 'warning' : 'active'
        } as any);
      }

      // Invalidate company stats cache so "Нарушения" обновились
      cache.delete(`company:${employeeAfter.company_id}:stats`);
    }
    
    res.json(violation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating violation", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    
    const violations = await storage.getViolationsByEmployee(employeeId, startDate, endDate);
    res.json(violations);
  } catch (error) {
    logger.error("Error fetching violations", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get company ratings
router.get("/companies/:companyId/ratings", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.query;
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart as string);
      endDate = new Date(periodEnd as string);
    }
    
    const ratings = await storage.getEmployeeRatingsByCompany(companyId, startDate, endDate);
    res.json(ratings);
  } catch (error) {
    logger.error("Error fetching ratings", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Recalculate company ratings
router.post("/companies/:companyId/recalculate", async (req, res) => {
  try {
    const { companyId } = req.params;
    const employees = await storage.getEmployeesByCompany(companyId);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const results = [] as any[];
    for (const emp of employees) {
      const rating = await storage.updateEmployeeRatingFromViolations(emp.id, periodStart, periodEnd);
      results.push({ employee_id: emp.id, rating });
    }

    res.json({ message: 'Пересчет завершен', count: results.length });
  } catch (error) {
    logger.error("Error recalculating ratings", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Global rating recalculation
router.post("/recalculate", async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body || {};
    const now = new Date();
    const start = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = periodEnd ? new Date(periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const companies = await storage.getAllCompanies();
    let processed = 0;
    for (const company of companies) {
      const employees = await storage.getEmployeesByCompany(company.id);
      for (const emp of employees) {
        await storage.updateEmployeeRatingFromViolations(emp.id, start, end);
        processed += 1;
      }
    }

    res.json({ message: 'Глобальный пересчет завершен', processed, periodStart: start.toISOString().split('T')[0], periodEnd: end.toISOString().split('T')[0] });
  } catch (error) {
    logger.error("Error recalculating ratings globally", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee rating
router.get("/employees/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { periodStart, periodEnd } = req.query;
    
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "periodStart and periodEnd are required" });
    }
    
    const startDate = new Date(periodStart as string);
    const endDate = new Date(periodEnd as string);
    
    const rating = await storage.getEmployeeRating(employeeId, startDate, endDate);
    if (!rating) {
      return res.status(404).json({ error: "Rating not found" });
    }
    
    res.json(rating);
  } catch (error) {
    logger.error("Error fetching employee rating", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Recalculate employee rating
router.post("/employees/:employeeId/recalculate", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { periodStart, periodEnd } = req.body;
    
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "periodStart and periodEnd are required" });
    }
    
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    
    const rating = await storage.updateEmployeeRatingFromViolations(employeeId, startDate, endDate);
    res.json(rating);
  } catch (error) {
    logger.error("Error recalculating rating", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Adjust employee rating by delta (e.g., +5 to increase)
router.post("/employees/:employeeId/adjust", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const schema = z.object({
      delta: z.number(),
      periodStart: z.string(),
      periodEnd: z.string(),
    });
    const { delta, periodStart, periodEnd } = schema.parse(req.body);

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Get or create rating for the period
    const existing = await storage.getEmployeeRating(employeeId, startDate, endDate);
    const current = existing ? Number(existing.rating) : 100;
    const updatedValue = Math.max(0, Math.min(100, current + delta));

    if (existing) {
      const updated = await storage.updateEmployeeRating(existing.id, { rating: String(updatedValue) } as any);
      return res.json(updated);
    } else {
      const created = await storage.createEmployeeRating({
        employee_id: employeeId,
        company_id: employee.company_id,
        period_start: periodStart,
        period_end: periodEnd,
        rating: String(updatedValue),
        status: updatedValue <= 30 ? 'terminated' : updatedValue <= 50 ? 'warning' : 'active'
      } as any);
      return res.json(created);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error adjusting rating', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

