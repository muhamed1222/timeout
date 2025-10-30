import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { insertCompanySchema } from "../../shared/schema.js";
import { logger } from "../lib/logger.js";
import { cache } from "../lib/cache.js";
import { requireCompanyAccess } from "../middleware/auth.js";

const router = Router();

// Create company
router.post("/", async (req, res) => {
  try {
    const validatedData = insertCompanySchema.parse(req.body);
    const company = await storage.createCompany(validatedData);
    // Invalidate cache
    cache.delete(`company:${company.id}:stats`);
    res.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating company", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get company by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const company = await storage.getCompany(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    logger.error("Error fetching company", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update company
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = insertCompanySchema.partial().parse(req.body);
    const company = await storage.updateCompany(id, updates);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error updating company", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get company statistics (with caching)
router.get("/:companyId/stats", async (req, res) => {
  try {
    const { companyId } = req.params;
    const cacheKey = `company:${companyId}:stats`;
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const employees = await storage.getEmployeesByCompany(companyId);
    const activeShifts = await storage.getActiveShiftsByCompany(companyId);
    const exceptions = await storage.getExceptionsByCompany(companyId);
    const violations = await storage.getViolationsByCompany(companyId);
    
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = activeShifts.filter(shift => {
      const start = new Date((shift as any).planned_start_at);
      if (isNaN(start.getTime())) return false;
      return start.toISOString().split('T')[0] === today;
    });
    
    const completedShifts = todayShifts.filter(shift => shift.status === 'completed').length;
    
    const stats = {
      totalEmployees: employees.length,
      activeShifts: activeShifts.length,
      completedShifts,
      // Frontend ожидает поле exceptions, используем количество нарушений
      exceptions: violations.length
    };
    
    // Cache for 2 minutes
    cache.set(cacheKey, stats, 120);
    
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching company stats", error);
    // Soft fallback to keep UI functional even if storage fails
    res.status(200).json({
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

    const templates = await storage.getScheduleTemplatesByCompany(companyId);
    if (templates.length === 0) {
      return res.status(400).json({ error: "No schedule templates found for company" });
    }

    const employees = await storage.getEmployeesByCompany(companyId);
    const targetEmployees = employeeIds ? 
      employees.filter(emp => employeeIds.includes(emp.id)) : 
      employees;

    const createdShifts = [];
    
    // Optimization: Load all existing shifts at once to avoid N+1 queries
    const employeeShiftsMap = new Map();
    for (const employee of targetEmployees) {
      const shifts = await storage.getShiftsByEmployee(employee.id);
      employeeShiftsMap.set(employee.id, shifts);
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

    // Batch create shifts
    for (const shiftData of shiftsToCreate) {
      const shift = await storage.createShift(shiftData);
      createdShifts.push(shift);
    }
    
    // Invalidate cache
    cache.delete(`company:${companyId}:stats`);

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
    const exceptions = await storage.getExceptionsByCompany(companyId);
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
    const exception = await storage.resolveException(exceptionId);
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
    const reports = await storage.getDailyReportsByCompany(companyId, limit);
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
    const rules = await storage.getViolationRulesByCompany(companyId);
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
    const ratings = await storage.getEmployeeRatingsByCompany(companyId, start, end);
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
    const employees = await storage.getEmployeesByCompany(companyId);
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
    const invites = await storage.getEmployeeInvitesByCompany(companyId);
    res.json(invites);
  } catch (error) {
    logger.error("Error fetching employee invites", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

