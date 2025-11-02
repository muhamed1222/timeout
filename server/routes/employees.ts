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
  logger.info('Updating employee', { 
    id: req.params.id, 
    body: req.body,
    avatar_id: req.body.avatar_id,
    full_name: req.body.full_name 
  });
  
  const employee = await repositories.employee.update(req.params.id, req.body as any);
  if (!employee) {
    throw new NotFoundError("Employee");
  }
  
  logger.info('Employee updated', { 
    id: employee.id,
    full_name: employee.full_name,
    avatar_id: (employee as any).avatar_id,
    photo_url: (employee as any).photo_url
  });
  
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

// Get employee statistics
router.get("/:id/stats", validateParams(employeeIdParamSchema), asyncHandler(async (req, res) => {
  const employee = await repositories.employee.findById(req.params.id);
  if (!employee) {
    throw new NotFoundError("Employee");
  }

  // Get all shifts for this employee
  const shifts = await repositories.shift.findByEmployeeId(req.params.id, 1000);
  
  // Calculate statistics
  const totalShifts = shifts.length;
  const completedShifts = shifts.filter(s => s.status === 'completed').length;
  
  // Calculate late count (shifts where actual_start > planned_start + 15 minutes)
  const lateCount = shifts.filter(s => {
    if (!s.actual_start_at || !s.planned_start_at) return false;
    const actualStart = new Date(s.actual_start_at).getTime();
    const plannedStart = new Date(s.planned_start_at).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    return actualStart > plannedStart + fifteenMinutes;
  }).length;

  // Calculate absence count (planned shifts that were never started)
  const absenceCount = shifts.filter(s => 
    s.status === 'planned' && 
    new Date(s.planned_start_at) < new Date()
  ).length;

  // Calculate average work hours
  const totalWorkHours = shifts.reduce((sum, s) => {
    if (s.actual_start_at && s.actual_end_at) {
      const start = new Date(s.actual_start_at).getTime();
      const end = new Date(s.actual_end_at).getTime();
      return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
    }
    return sum;
  }, 0);
  const avgWorkHours = completedShifts > 0 ? totalWorkHours / completedShifts : 0;

  // Calculate efficiency index
  // Formula: (completed - late * 0.5 - absence * 2) / total * 100
  const efficiencyScore = Math.max(0, completedShifts - lateCount * 0.5 - absenceCount * 2);
  const efficiencyIndex = totalShifts > 0 ? (efficiencyScore / totalShifts) * 100 : 0;

  res.json({
    efficiency_index: Math.min(100, Math.max(0, efficiencyIndex)),
    total_shifts: totalShifts,
    completed_shifts: completedShifts,
    late_count: lateCount,
    absence_count: absenceCount,
    avg_work_hours: avgWorkHours,
  });
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

