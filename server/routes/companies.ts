import { Router } from "express";
import { z } from "zod";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getOrSet } from "../lib/utils/cache.js";
import { NotFoundError, ValidationError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { createCompanySchema, updateCompanySchema, companyIdParamSchema, companyIdInParamsSchema, generateShiftsSchema, exceptionIdParamSchema } from "../lib/schemas/index.js";
import { dateRangeQuerySchema, limitQuerySchema } from "../lib/schemas/common.schemas.js";
import { invalidateCompanyStats } from "../lib/utils/index.js";
import type { Shift, EmployeeSchedule, InsertShift } from "../../shared/schema.js";

interface ScheduleRules {
  workdays?: number[];
  shift_start: string;
  shift_end: string;
}

interface ExceptionOrViolationItem {
  id: string;
  detected_at?: string;
  created_at?: string;
}

const router = Router();

// Create company
router.post("/", validateBody(createCompanySchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.create(req.body);
  await invalidateCompanyStats(company.id);
  res.json(company);
}));

// Get company by ID
router.get("/:id", validateParams(companyIdParamSchema), asyncHandler(async (req, res) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn("Company fetch timeout", { companyId: req.params.id });
      res.status(503).json({
        error: "Request timeout",
        message: "Database query took too long. Please try again.",
      });
    }
  }, 5000);

  try {
    const company = await Promise.race([
      repositories.company.findById(req.params.id),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database query timeout")), 4500),
      ),
    ]);
    
    clearTimeout(timeout);
    if (!company) {
      throw new NotFoundError("Company");
    }
    res.json(company);
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof NotFoundError) {
      throw error;
    }
    // Re-throw other errors to be handled by asyncHandler
    throw error;
  }
}));

// Update company
router.put("/:id", validateParams(companyIdParamSchema), validateBody(updateCompanySchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.update(req.params.id, req.body);
  if (!company) {
    throw new NotFoundError("Company");
  }
  res.json(company);
}));

// Get company statistics (with caching)
router.get("/:companyId/stats", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  // Set timeout for the entire request (5 seconds)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn("Company stats request timeout", { companyId: req.params.companyId });
      res.status(503).json({
        error: "Request timeout",
        message: "Database query took too long. Please try again.",
        fallback: {
          totalEmployees: 0,
          activeShifts: 0,
          completedShifts: 0,
          exceptions: 0,
        },
      });
    }
  }, 5000);

  try {
    const { companyId } = req.params;
    const cacheKey = `company:${companyId}:stats`;
    
    // Use cache utility with async cache
    const stats = await Promise.race([
      getOrSet(
        cacheKey,
        async () => {
          const employees = await repositories.employee.findByCompanyId(companyId);
          const activeShifts = await repositories.shift.findActiveByCompanyId(companyId);
          await repositories.exception.findByCompanyId(companyId);
          const violations = await repositories.violation.findViolationsByCompany(companyId);
          
          const today = new Date().toISOString().split("T")[0];
          const todayShifts = activeShifts.filter(shift => {
            const start = new Date((shift as any).planned_start_at);
            if (isNaN(start.getTime())) {
              return false;
            }
            return start.toISOString().split("T")[0] === today;
          });
          
          const completedShifts = todayShifts.filter(shift => shift.status === "completed").length;
          
          return {
            totalEmployees: employees.length,
            activeShifts: activeShifts.length,
            completedShifts,
            // Frontend ожидает поле exceptions, используем количество нарушений
            exceptions: violations.length,
          };
        },
        120, // Cache for 2 minutes
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database query timeout")), 4500),
      ),
    ]);
    
    clearTimeout(timeout);
    res.json(stats);
  } catch (error) {
    clearTimeout(timeout);
    // Re-throw error to be handled by asyncHandler
    // This will properly set status code based on error type
    throw error;
  }
}));

// Generate shifts for company
router.post("/:companyId/generate-shifts", validateParams(companyIdInParamsSchema), validateBody(generateShiftsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { startDate, endDate, employeeIds } = req.body;
  
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  // Ограничение на диапазон дат (максимум 1 год)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    throw new ValidationError("Date range cannot exceed 365 days");
  }

  const templates = await repositories.schedule.findByCompanyId(companyId);
  if (templates.length === 0) {
    throw new ValidationError("No schedule templates found for company");
  }

  const employees = await repositories.employee.findByCompanyId(companyId);
  const targetEmployees = employeeIds ? 
    employees.filter(emp => employeeIds.includes(emp.id)) : 
    employees;

  if (targetEmployees.length === 0) {
    throw new ValidationError("No employees found for generation");
  }

  const createdShifts = [];
  const skippedShifts = [];
  const employeesWithoutSchedule: string[] = [];
    
  // Optimization: Load all existing shifts at once to avoid N+1 queries
  const targetEmployeeIds = targetEmployees.map(emp => emp.id);
  const allShifts = targetEmployeeIds.length > 0
    ? await repositories.shift.findByEmployeeIds(targetEmployeeIds)
    : [];
    
  // Group shifts by employee_id
  const employeeShiftsMap = new Map<string, Shift[]>();
  for (const shift of allShifts) {
    const employeeId = shift.employee_id;
    if (!employeeShiftsMap.has(employeeId)) {
      employeeShiftsMap.set(employeeId, []);
    }
      employeeShiftsMap.get(employeeId)!.push(shift);
  }

  // Prepare shifts to be created in batch
  const shiftsToCreate = [];

  // Создаем мапу шаблонов для быстрого доступа
  const templatesMap = new Map(templates.map(t => [t.id, t]));

  // Оптимизация: загружаем все назначения графиков для всех сотрудников заранее
  const allEmployeeSchedules = await Promise.all(
    targetEmployees.map(emp => repositories.schedule.findEmployeeSchedules(emp.id)),
  );
    
  // Создаем мапу назначений: employee_id -> массив назначений
  const employeeSchedulesMap = new Map<string, EmployeeSchedule[]>();
  targetEmployees.forEach((emp, idx) => {
    employeeSchedulesMap.set(emp.id, allEmployeeSchedules[idx]);
  });

  for (const employee of targetEmployees) {
    const existingShifts = employeeShiftsMap.get(employee.id) || [];
    const employeeScheduleAssignments = employeeSchedulesMap.get(employee.id) || [];
    let hasScheduleForPeriod = false;
      
    if (employeeScheduleAssignments.length === 0) {
      employeesWithoutSchedule.push(employee.id);
      continue;
    }

    // Проходим по каждой дате в периоде
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Ищем активное назначение графика для этой даты (в памяти, без запросов к БД)
      let activeSchedule: EmployeeSchedule | null = null;
        
      for (const assignment of employeeScheduleAssignments) {
        const validFrom = new Date(assignment.valid_from);
        const validTo = assignment.valid_to ? new Date(assignment.valid_to) : null;
          
        // Проверяем, действует ли назначение на эту дату
        if (date >= validFrom && (!validTo || date <= validTo)) {
          // Если есть несколько назначений, берем самое позднее (по valid_from)
          if (!activeSchedule || new Date(assignment.valid_from) > new Date(activeSchedule.valid_from)) {
            activeSchedule = assignment;
          }
        }
      }
        
      if (!activeSchedule) {
        // Сотрудник не имеет назначенного графика на эту дату
        if (!employeesWithoutSchedule.includes(employee.id)) {
          employeesWithoutSchedule.push(employee.id);
        }
        continue;
      }

      hasScheduleForPeriod = true;

      // Находим шаблон графика
      const template = templatesMap.get(activeSchedule.schedule_id);
      if (!template) {
        logger.warn(`Template not found for schedule_id: ${activeSchedule.schedule_id}`);
        continue;
      }

      const rules = template.rules as ScheduleRules;
      const dayOfWeek = date.getDay();
        
      // Проверяем, является ли день рабочим
      if (!rules.workdays?.includes(dayOfWeek)) {
        continue;
      }

      // Проверяем, нет ли уже существующей смены на эту дату
      const existingShift = existingShifts.find((s: Shift) => {
        const shiftDate = new Date(s.planned_start_at);
        shiftDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === checkDate.getTime();
      });
        
      if (existingShift) {
        skippedShifts.push({
          employee_id: employee.id,
          date: date.toISOString().split("T")[0],
          reason: "shift_exists",
        });
        continue;
      }

      // Создаем смену по правилам графика
      const shiftStart = new Date(date);
      const [startHour, startMinute] = rules.shift_start.split(":").map(Number);
      shiftStart.setHours(startHour, startMinute, 0, 0);
        
      const shiftEnd = new Date(date);
      const [endHour, endMinute] = rules.shift_end.split(":").map(Number);
      shiftEnd.setHours(endHour, endMinute, 0, 0);

      shiftsToCreate.push({
        employee_id: employee.id,
        planned_start_at: shiftStart,
        planned_end_at: shiftEnd,
        status: "planned",
      });
    }

    if (!hasScheduleForPeriod && !employeesWithoutSchedule.includes(employee.id)) {
      employeesWithoutSchedule.push(employee.id);
    }
  }

  // Batch create shifts using bulk insert for better performance
  if (shiftsToCreate.length > 0) {
    const created = await repositories.shift.createMany(shiftsToCreate as InsertShift[]);
    createdShifts.push(...created);
  }
    
  // Invalidate cache
  await invalidateCompanyStats(companyId);

  const result = {
    message: `Created ${createdShifts.length} shifts`,
    shifts: createdShifts,
    stats: {
      created: createdShifts.length,
      skipped: skippedShifts.length,
      employeesWithoutSchedule: employeesWithoutSchedule.length,
      totalEmployees: targetEmployees.length,
    },
  };

  if (employeesWithoutSchedule.length > 0) {
    result.message += `. ${employeesWithoutSchedule.length} employee(s) without assigned schedule were skipped`;
  }

  res.json(result);
}));

// Get employee schedules for company
router.get("/:companyId/employee-schedules", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const schedules = await repositories.schedule.findEmployeeSchedulesByCompanyId(companyId);
  res.json(schedules);
}));

// Monitor company shifts
router.post("/:companyId/monitor", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { shiftMonitor } = await import("../services/shiftMonitor.js");
  const result = await shiftMonitor.processCompanyShifts(companyId);
  res.json({
    message: "Shift monitoring completed",
    ...result,
  });
}));

// Check violations
router.get("/:companyId/violations", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { shiftMonitor } = await import("../services/shiftMonitor.js");
  const violations = await shiftMonitor.checkShiftViolations(companyId);
  res.json(violations);
}));

// Get exceptions and violations by company
router.get("/:companyId/exceptions", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
    
  // Get both exceptions and violations
  const [exceptions, violations] = await Promise.all([
    repositories.exception.findByCompanyId(companyId),
    repositories.violation.findViolationsByCompany(companyId),
  ]);

  // Transform violations to match exception format for display
  const violationsAsExceptions = await Promise.all(
    violations.map(async (violation) => {
      const employee = await repositories.employee.findById(violation.employee_id);
      const rule = await repositories.violation.findById(violation.rule_id);
        
      return {
        id: violation.id,
        employee: {
          id: employee?.id || violation.employee_id,
          full_name: employee?.full_name || "Неизвестный сотрудник",
        },
        exception_type: "violation",
        description: rule 
          ? `Нарушение: ${rule.name}${violation.reason ? `. ${violation.reason}` : ""}`
          : violation.reason || "Нарушение",
        detected_at: violation.created_at || new Date().toISOString(),
        severity: Number(violation.penalty) > 50 ? 3 : Number(violation.penalty) > 25 ? 2 : 1,
        source: violation.source,
        penalty: violation.penalty,
        rule_name: rule?.name,
      };
    }),
  );

  // Combine exceptions and violations, sort by date
  const allItems = [...exceptions, ...violationsAsExceptions].sort((a: ExceptionOrViolationItem, b: ExceptionOrViolationItem) => {
    const dateA = new Date(a.detected_at || a.created_at || 0).getTime();
    const dateB = new Date(b.detected_at || b.created_at || 0).getTime();
    return dateB - dateA; // newest first
  });

  res.json(allItems);
}));

// Resolve exception
router.post("/:companyId/exceptions/:exceptionId/resolve", validateParams(exceptionIdParamSchema), asyncHandler(async (req, res) => {
  const { exceptionId } = req.params;
  const exception = await repositories.exception.resolve(exceptionId);
  if (!exception) {
    throw new NotFoundError("Exception");
  }
  
  logger.info("Exception resolved", { exceptionId });
  res.json({ success: true, exception });
}));

// Get daily reports by company
router.get("/:companyId/daily-reports", validateParams(companyIdInParamsSchema), validateQuery(limitQuerySchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const limit = req.query.limit || 50;
  const reports = await repositories.shift.findDailyReportsByCompanyId(companyId, limit);
  res.json(reports);
}));

// Get violation rules by company (alias for frontend compatibility)
router.get("/:companyId/violation-rules", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const rules = await repositories.violation.findByCompanyId(companyId);
  res.json(rules);
}));

// Get ratings by company and period
router.get("/:companyId/ratings", validateParams(companyIdInParamsSchema), validateQuery(dateRangeQuerySchema.extend({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { periodStart, periodEnd } = req.query;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const ratings = await repositories.rating.findByCompanyId(companyId, start, end);
  res.json(ratings);
}));

// Get employees by company
router.get("/:companyId/employees", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const employees = await repositories.employee.findByCompanyId(companyId);
  // Ensure avatar_id and photo_url are present (for backward compatibility with DBs that don't have these fields yet)
  const employeesWithDefaults = employees.map(emp => ({
    ...emp,
    avatar_id: emp.avatar_id ?? null,
    photo_url: emp.photo_url ?? null,
  }));
  res.json(employeesWithDefaults);
}));

// Get employee invites by company
router.get("/:companyId/employee-invites", validateParams(companyIdInParamsSchema), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const invites = await repositories.invite.findByCompanyId(companyId);
  res.json(invites);
}));

export default router;

