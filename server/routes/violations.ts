import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";

const router = Router();

const createViolationRequest = z.object({
  employee_id: z.string(),
  company_id: z.string(),
  rule_id: z.string(),
  source: z.enum(['manual', 'auto']).default('manual'),
  reason: z.string().optional(),
  created_by: z.string().optional()
});

router.post('/', async (req, res) => {
  try {
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

    // Update rating for current month
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    await storage.updateEmployeeRatingFromViolations(
      violation.employee_id,
      periodStart,
      periodEnd
    );

    res.json(violation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating violation (alias)', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


