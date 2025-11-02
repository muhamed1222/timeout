import { Router } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getOrSet } from "../lib/utils/cache.js";
import { NotFoundError, asyncHandler } from "../lib/errorHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createCompanySchema, updateCompanySchema, companyIdParamSchema } from "../lib/schemas/index.js";
import { invalidateCompanyStats } from "../lib/utils/index.js";

const router = Router();

// Create company
router.post("/", validateBody(createCompanySchema), asyncHandler(async (req, res) => {
  const company = await repositories.company.create(req.body);
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
  const company = await repositories.company.update(req.params.id, req.body);
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
    
    // Валидация дат
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (end < start) {
      return res.status(400).json({ error: "endDate must be greater than or equal to startDate" });
    }

    // Ограничение на диапазон дат (максимум 1 год)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({ error: "Date range cannot exceed 365 days" });
    }

    const templates = await repositories.schedule.findByCompanyId(companyId);
    if (templates.length === 0) {
      return res.status(400).json({ error: "No schedule templates found for company" });
    }

    const employees = await repositories.employee.findByCompanyId(companyId);
    const targetEmployees = employeeIds ? 
      employees.filter(emp => employeeIds.includes(emp.id)) : 
      employees;

    if (targetEmployees.length === 0) {
      return res.status(400).json({ error: "No employees found for generation" });
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

    // Создаем мапу шаблонов для быстрого доступа
    const templatesMap = new Map(templates.map(t => [t.id, t]));

    // Оптимизация: загружаем все назначения графиков для всех сотрудников заранее
    const allEmployeeSchedules = await Promise.all(
      targetEmployees.map(emp => repositories.schedule.findEmployeeSchedules(emp.id)),
    );
    
    // Создаем мапу назначений: employee_id -> массив назначений
    const employeeSchedulesMap = new Map<string, any[]>();
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
        let activeSchedule: any = null;
        
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

        const rules = template.rules as any;
        const dayOfWeek = date.getDay();
        
        // Проверяем, является ли день рабочим
        if (!rules.workdays?.includes(dayOfWeek)) {
          continue;
        }

        // Проверяем, нет ли уже существующей смены на эту дату
        const existingShift = existingShifts.find((s: any) => {
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
      const created = await repositories.shift.createMany(shiftsToCreate as any);
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
  } catch (error) {
    logger.error("Error generating shifts", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get employee schedules for company
router.get("/:companyId/employee-schedules", async (req, res) => {
  try {
    const { companyId } = req.params;
    const schedules = await repositories.schedule.findEmployeeSchedulesByCompanyId(companyId);
    res.json(schedules);
  } catch (error) {
    logger.error("Error fetching employee schedules", error);
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
      ...result,
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

// Get exceptions and violations by company
router.get("/:companyId/exceptions", async (req, res) => {
  try {
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
    const allItems = [...exceptions, ...violationsAsExceptions].sort((a, b) => {
      const dateA = new Date((a as any).detected_at || (a as any).created_at || 0).getTime();
      const dateB = new Date((b as any).detected_at || (b as any).created_at || 0).getTime();
      return dateB - dateA; // newest first
    });

    res.json(allItems);
  } catch (error) {
    logger.error("Error fetching exceptions and violations", error);
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
    // Ensure avatar_id and photo_url are present (for backward compatibility with DBs that don't have these fields yet)
    const employeesWithDefaults = employees.map(emp => ({
      ...emp,
      avatar_id: emp.avatar_id ?? null,
      photo_url: emp.photo_url ?? null,
    }));
    res.json(employeesWithDefaults);
  } catch (error) {
    logger.error("Error fetching employees", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      companyId: req.params.companyId,
    });
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

