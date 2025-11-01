import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getOrSet } from "../lib/utils/cache.js";
import { requireCompanyAccess } from "../middleware/auth.js";
import { NotFoundError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createCompanySchema, updateCompanySchema, companyIdParamSchema } from "../lib/schemas/index.js";
import { invalidateCompanyStats } from "../lib/utils/index.js";

const router = Router();

// Create company
router.post("/", validateBody(createCompanySchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.create(req.body as any);
  await invalidateCompanyStats(company.id);
  res.json(company);
}));

// Get company by ID
router.get("/:id", validateParams(companyIdParamSchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.findById(req.params.id);
  if (!company) {
    throw new NotFoundError("Company");
  }
  res.json(company);
}));

// Update company
router.put("/:id", validateParams(companyIdParamSchema), validateBody(updateCompanySchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.update(req.params.id, req.body as any);
  if (!company) {
    throw new NotFoundError("Company");
  }
  res.json(company);
}));

// Get company statistics (with caching)
router.get("/:companyId/stats", async (req, res) => {
  try {
    const { companyId } = req.params;
    const cacheKey = `company:${companyId}:stats`;
    
    // Use cache utility with async cache
    const stats = await getOrSet(
      cacheKey,
      async () => {
        const employees = await repositories.employee.findByCompanyId(companyId);
        const activeShifts = await repositories.shift.findActiveByCompanyId(companyId);
        const exceptions = await repositories.exception.findByCompanyId(companyId);
        const violations = await repositories.violation.findViolationsByCompany(companyId);
        
        const today = new Date().toISOString().split('T')[0];
        const todayShifts = activeShifts.filter(shift => {
          const start = new Date((shift as any).planned_start_at);
          if (isNaN(start.getTime())) return false;
          return start.toISOString().split('T')[0] === today;
        });
        
        const completedShifts = todayShifts.filter(shift => shift.status === 'completed').length;
        
        return {
          totalEmployees: employees.length,
          activeShifts: activeShifts.length,
          completedShifts,
          // Frontend ожидает поле exceptions, используем количество нарушений
          exceptions: violations.length
        };
      },
      120 // Cache for 2 minutes
    );
    
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching company stats", error);
    // Soft fallback to keep UI functional even if storage fails
    res.json({
      totalEmployees: 0,
      activeShifts: 0,
      completedShifts: 0,
      exceptions: 0,
    });
  }
});

// Generate shifts for company
router.post("/:companyId/generate-shifts", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate, employeeIds } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const templates = await repositories.schedule.findByCompanyId(companyId);
    if (templates.length === 0) {
      return res.status(400).json({ error: "No schedule templates found for company" });
    }

    const employees = await repositories.employee.findByCompanyId(companyId);
    const targetEmployees = employeeIds ? 
      employees.filter(emp => employeeIds.includes(emp.id)) : 
      employees;

    const createdShifts = [];
    
    // Optimization: Load all existing shifts at once to avoid N+1 queries
    const targetEmployeeIds = targetEmployees.map(emp => emp.id);
    const allShifts = targetEmployeeIds.length > 0
      ? await repositories.shift.findByEmployeeIds(targetEmployeeIds)
      : [];
    
    // Group shifts by employee_id
    const employeeShiftsMap = new Map<string, typeof allShifts>();
    for (const shift of allShifts) {
      const employeeId = (shift as any).employee_id;
      if (!employeeShiftsMap.has(employeeId)) {
        employeeShiftsMap.set(employeeId, []);
      }
      employeeShiftsMap.get(employeeId)!.push(shift);
    }

    // Prepare shifts to be created in batch
    const shiftsToCreate = [];

    for (const employee of targetEmployees) {
      const template = templates[0];
      const rules = template.rules as any; // Type assertion for rules object
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const existingShifts = employeeShiftsMap.get(employee.id) || [];
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        if (rules.workdays && rules.workdays.includes(dayOfWeek)) {
          const shiftStart = new Date(date);
          const [startHour, startMinute] = rules.shift_start.split(':').map(Number);
          shiftStart.setHours(startHour, startMinute, 0, 0);
          
          const shiftEnd = new Date(date);
          const [endHour, endMinute] = rules.shift_end.split(':').map(Number);
          shiftEnd.setHours(endHour, endMinute, 0, 0);
          
          const existingShift = existingShifts.find((s: any) => {
            const shiftDate = new Date(s.planned_start_at);
            shiftDate.setHours(0, 0, 0, 0);
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            return shiftDate.getTime() === checkDate.getTime();
          });
          
          if (!existingShift) {
            shiftsToCreate.push({
              employee_id: employee.id,
              planned_start_at: shiftStart,
              planned_end_at: shiftEnd,
              status: 'planned'
            });
          }
        }
      }
    }

    // Batch create shifts using bulk insert for better performance
    if (shiftsToCreate.length > 0) {
      const created = await repositories.shift.createMany(shiftsToCreate as any);
      createdShifts.push(...created);
    }
    
    // Invalidate cache
      await invalidateCompanyStats(companyId);

    res.json({ 
      message: `Created ${createdShifts.length} shifts`,
      shifts: createdShifts 
    });
  } catch (error) {
    logger.error("Error generating shifts", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Monitor company shifts
router.post("/:companyId/monitor", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { shiftMonitor } = await import("../services/shiftMonitor.js");
    const result = await shiftMonitor.processCompanyShifts(companyId);
    res.json({
      message: "Shift monitoring completed",
      ...result
    });
  } catch (error) {
    logger.error("Error in shift monitoring", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check violations
router.get("/:companyId/violations", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { shiftMonitor } = await import("../services/shiftMonitor.js");
    const violations = await shiftMonitor.checkShiftViolations(companyId);
    res.json(violations);
  } catch (error) {
    logger.error("Error checking violations", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get exceptions by company
router.get("/:companyId/exceptions", async (req, res) => {
  try {
    const { companyId } = req.params;
    const exceptions = await repositories.exception.findByCompanyId(companyId);
    res.json(exceptions);
  } catch (error) {
    logger.error("Error fetching exceptions", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resolve exception
router.post("/:companyId/exceptions/:exceptionId/resolve", async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const exception = await repositories.exception.resolve(exceptionId);
    if (!exception) {
      return res.status(404).json({ error: "Exception not found" });
    }
    
    logger.info("Exception resolved", { exceptionId });
    res.json({ success: true, exception });
  } catch (error) {
    logger.error("Error resolving exception", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get daily reports by company
router.get("/:companyId/daily-reports", async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const reports = await repositories.shift.findDailyReportsByCompanyId(companyId, limit);
    res.json(reports);
  } catch (error) {
    logger.error("Error fetching daily reports", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get violation rules by company (alias for frontend compatibility)
router.get("/:companyId/violation-rules", async (req, res) => {
  try {
    const { companyId } = req.params;
    const rules = await repositories.violation.findByCompanyId(companyId);
    res.json(rules);
  } catch (error) {
    logger.error("Error fetching violation rules", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get ratings by company and period
router.get("/:companyId/ratings", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.query as { periodStart?: string; periodEnd?: string };
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "periodStart and periodEnd are required" });
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid periodStart or periodEnd" });
    }
    const ratings = await repositories.rating.findByCompanyId(companyId, start, end);
    res.json(ratings);
  } catch (error) {
    logger.error("Error fetching ratings", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employees by company
router.get("/:companyId/employees", async (req, res) => {
  try {
    const { companyId } = req.params;
    const employees = await repositories.employee.findByCompanyId(companyId);
    res.json(employees);
  } catch (error) {
    logger.error("Error fetching employees", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee invites by company
router.get("/:companyId/employee-invites", async (req, res) => {
  try {
    const { companyId } = req.params;
    const invites = await repositories.invite.findByCompanyId(companyId);
    res.json(invites);
  } catch (error) {
    logger.error("Error fetching employee invites", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

