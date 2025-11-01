import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createEmployeeSchema, updateEmployeeSchema, employeeIdParamSchema, telegramUserIdParamSchema } from "../lib/schemas/index.js";
import { invalidateCompanyStatsByEmployeeId, invalidateCompanyStats } from "../lib/utils/index.js";

const router = Router();

// Create employee
router.post("/", validateBody(createEmployeeSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.create(req.body as any);
  await invalidateCompanyStatsByEmployeeId(employee.id);
  res.json(employee);
}));

// Get employee by ID
router.get("/:id", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findById(req.params.id);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  res.json(employee);
}));

// Update employee
router.put("/:id", validateParams(employeeIdParamSchema), validateBody(updateEmployeeSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.update(req.params.id, req.body as any);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  res.json(employee);
}));

// Delete employee
router.delete("/:id", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findById(req.params.id);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  const companyId = employee.company_id;
  await repositories.employee.delete(req.params.id);
  await invalidateCompanyStats(companyId);
  res.json({ success: true });
}));

// Get employee by Telegram ID
router.get("/telegram/:telegramUserId", validateParams(telegramUserIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findByTelegramId(req.params.telegramUserId);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  res.json(employee);
}));

export default router;

