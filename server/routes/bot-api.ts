import { Router, Request, Response, NextFunction } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getSecret } from "../lib/secrets.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { 
  linkTelegramSchema, 
  uuidSchema, 
  startShiftSchema, 
  endShiftSchema,
  startBreakSchema,
  endBreakSchema,
  createDailyReportSchema
} from "../lib/validation.js";
import { auditLogger } from "../lib/audit.js";
import { z } from "zod";
import { botRateLimit } from "../middleware/rate-limit.js";

const router = Router();

// Middleware для проверки секретного ключа бота
const authenticateBot = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const botSecret = req.headers['x-bot-secret'];
  const expectedSecret = getSecret('BOT_API_SECRET') || getSecret('API_SECRET_KEY');
  
  if (!botSecret || botSecret !== expectedSecret) {
    logger.warn('Unauthorized bot API request', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Применяем middleware ко всем routes
router.use(authenticateBot);
router.use(botRateLimit);

// ============================================================================
// AUTHENTICATION & EMPLOYEES
// ============================================================================

// Привязка сотрудника к Telegram через invite code
router.post(
  "/employee-invites/:code/accept",
  validateBody(linkTelegramSchema),
  async (req, res) => {
    try {
      const { code } = req.params;
      const { telegram_id, telegram_username } = req.body;

      // Находим приглашение
      const invite = await repositories.invite.findByCode(code);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found or expired" });
      }

      if (invite.used_by_employee) {
        return res.status(400).json({ error: "Invite already used" });
      }

      // Обновляем сотрудника
      const employee = await repositories.employee.update(invite.used_by_employee!, {
        telegram_user_id: telegram_id,
      } as any);

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Отмечаем приглашение как использованное
      await repositories.invite.updateByCode(invite.code, {
        // used_at обновится автоматически
      } as any);

      // Audit log
      await auditLogger.logResourceChange({
        action: 'employee.telegram_link',
        actorId: employee.id,
        actorType: 'bot',
        companyId: employee.company_id,
        resourceType: 'employee',
        resourceId: employee.id,
        changes: { telegram_id, telegram_username },
      });

      res.json(employee);
      logger.info('Employee linked to Telegram', {
        employeeId: employee.id,
        telegramId: telegram_id
      });
    } catch (error) {
      logger.error("Error accepting invite", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  }
);

// Получить сотрудника по Telegram ID
router.get("/employees/telegram/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;

    const employee = await repositories.employee.findByTelegramId(telegramId);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee);
  } catch (error) {
    logger.error("Error fetching employee by Telegram ID", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// ============================================================================
// SHIFTS
// ============================================================================

// Получить смены сотрудника
router.get("/employees/:id/shifts", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    const shifts = await repositories.shift.findByEmployeeId(id, limit);
    res.json(shifts);
  } catch (error) {
    logger.error("Error fetching employee shifts", error);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// Получить информацию о смене
router.get("/shifts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await repositories.shift.findById(id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    res.json(shift);
  } catch (error) {
    logger.error("Error fetching shift", error);
    res.status(500).json({ error: "Failed to fetch shift" });
  }
});

// Начать смену
router.post("/shifts/:id/start", async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await repositories.shift.findById(id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    if (shift.status !== 'scheduled') {
      return res.status(400).json({ 
        error: "Shift cannot be started", 
        currentStatus: shift.status 
      });
    }

    // Создаем рабочий интервал
    const workInterval = await repositories.shift.createWorkInterval({
      shift_id: id,
      start_at: new Date(),
    });

    // Обновляем статус смены
    const updatedShift = await repositories.shift.update(id, {
      status: 'active',
      actual_start_at: new Date(),
    });

    res.json({ shift: updatedShift, workInterval });
    logger.info('Shift started', { shiftId: id, employeeId: shift.employee_id });
  } catch (error) {
    logger.error("Error starting shift", error);
    res.status(500).json({ error: "Failed to start shift" });
  }
});

// Завершить смену
router.post("/shifts/:id/end", async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await repositories.shift.findById(id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    if (shift.status !== 'active') {
      return res.status(400).json({ 
        error: "Shift is not active", 
        currentStatus: shift.status 
      });
    }

    // Завершаем активный рабочий интервал
    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(id);
    const activeInterval = workIntervals.find(wi => !wi.end_at);

    if (activeInterval) {
      await repositories.shift.updateWorkInterval(activeInterval.id, {
        end_at: new Date(),
      });
    }

    // Завершаем активный перерыв (если есть)
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    if (activeBreak) {
      await repositories.shift.updateBreakInterval(activeBreak.id, {
        end_at: new Date(),
      });
    }

    // Обновляем статус смены
    const updatedShift = await repositories.shift.update(id, {
      status: 'completed',
      actual_end_at: new Date(),
    });

    res.json(updatedShift);
    logger.info('Shift ended', { shiftId: id, employeeId: shift.employee_id });
  } catch (error) {
    logger.error("Error ending shift", error);
    res.status(500).json({ error: "Failed to end shift" });
  }
});

// ============================================================================
// BREAKS
// ============================================================================

// Начать перерыв
router.post("/shifts/:id/break/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'lunch' } = req.body;

    const shift = await repositories.shift.findById(id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    if (shift.status !== 'active') {
      return res.status(400).json({ error: "Shift is not active" });
    }

    // Проверяем, нет ли активного перерыва
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    if (activeBreak) {
      return res.status(400).json({ error: "Break already in progress" });
    }

    // Создаем перерыв
    const breakInterval = await repositories.shift.createBreakInterval({
      shift_id: id,
      type: type,
      start_at: new Date(),
    });

    res.json(breakInterval);
    logger.info('Break started', { shiftId: id, breakType: type });
  } catch (error) {
    logger.error("Error starting break", error);
    res.status(500).json({ error: "Failed to start break" });
  }
});

// Завершить перерыв
router.post("/shifts/:id/break/end", async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await repositories.shift.findById(id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    // Находим активный перерыв
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    if (!activeBreak) {
      return res.status(400).json({ error: "No active break found" });
    }

    // Завершаем перерыв
    const updatedBreak = await repositories.shift.updateBreakInterval(activeBreak.id, {
      end_at: new Date(),
    });

    res.json(updatedBreak);
    logger.info('Break ended', { shiftId: id, breakId: activeBreak.id });
  } catch (error) {
    logger.error("Error ending break", error);
    res.status(500).json({ error: "Failed to end break" });
  }
});

// Получить рабочие интервалы смены
router.get("/shifts/:id/work-intervals", async (req, res) => {
  try {
    const { id } = req.params;

    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(id);
    res.json(workIntervals);
  } catch (error) {
    logger.error("Error fetching work intervals", error);
    res.status(500).json({ error: "Failed to fetch work intervals" });
  }
});

// Получить интервалы перерывов смены
router.get("/shifts/:id/break-intervals", async (req, res) => {
  try {
    const { id } = req.params;

    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(id);
    res.json(breakIntervals);
  } catch (error) {
    logger.error("Error fetching break intervals", error);
    res.status(500).json({ error: "Failed to fetch break intervals" });
  }
});

// ============================================================================
// REPORTS & EXCEPTIONS
// ============================================================================

// Создать ежедневный отчет
router.post("/daily-reports", async (req, res) => {
  try {
    const { employee_id, shift_id, content } = req.body;

    if (!employee_id || !shift_id || !content) {
      return res.status(400).json({ 
        error: "employee_id, shift_id, and content are required" 
      });
    }

    // Получаем смену для проверки
    const shift = await repositories.shift.findById(shift_id);

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const report = await repositories.shift.createDailyReport({
      shift_id,
      done_items: [content], // Используем массив для done_items
      submitted_at: new Date(),
    });

    res.json(report);
    logger.info('Daily report created', { reportId: report.id, employeeId: employee_id });
  } catch (error) {
    logger.error("Error creating daily report", error);
    res.status(500).json({ error: "Failed to create daily report" });
  }
});

// Создать исключение (отсутствие и т.д.)
router.post("/exceptions", async (req, res) => {
  try {
    const { employee_id, company_id, shift_id, date, type, reason } = req.body;

    if (!employee_id || !date || !type) {
      return res.status(400).json({ 
        error: "employee_id, date, and type are required" 
      });
    }

    const exception = await repositories.exception.create({
      employee_id,
      date,
      kind: type,
      details: reason ? { reason } : undefined,
    });

    res.json(exception);
    logger.info('Exception created', { exceptionId: exception.id, type, employeeId: employee_id });
  } catch (error) {
    logger.error("Error creating exception", error);
    res.status(500).json({ error: "Failed to create exception" });
  }
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

// Send notification to a specific employee via Telegram
router.post("/notifications/send", async (req, res) => {
  try {
    const { employee_id, message, urgent = false } = req.body;

    if (!employee_id || !message) {
      return res.status(400).json({ 
        error: "employee_id and message are required" 
      });
    }

    // Get employee with Telegram ID
    const employee = await repositories.employee.findById(employee_id);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (!employee.telegram_user_id) {
      return res.status(400).json({ 
        error: "Employee does not have Telegram linked" 
      });
    }

    // Store notification info for the bot to pick up
    // In a real implementation, you'd queue this or use a webhook to the bot
    logger.info('Notification request received', {
      employeeId: employee_id,
      telegramId: employee.telegram_user_id,
      urgent
    });

    // Return success - the actual sending would be done by the bot
    res.json({
      success: true,
      telegram_id: employee.telegram_user_id,
      message: "Notification queued for delivery"
    });
  } catch (error) {
    logger.error("Error queueing notification", error);
    res.status(500).json({ error: "Failed to queue notification" });
  }
});

// Broadcast notification to all employees of a company
router.post("/notifications/broadcast", async (req, res) => {
  try {
    const { company_id, message } = req.body;

    if (!company_id || !message) {
      return res.status(400).json({ 
        error: "company_id and message are required" 
      });
    }

    // Get all employees with Telegram IDs for this company
    const employees = await repositories.employee.findByCompanyId(company_id);
    const telegramEmployees = employees.filter(emp => emp.telegram_user_id);

    logger.info('Broadcast notification request', {
      companyId: company_id,
      totalEmployees: employees.length,
      withTelegram: telegramEmployees.length
    });

    // Return list of Telegram IDs to notify
    res.json({
      success: true,
      total_employees: employees.length,
      employees_with_telegram: telegramEmployees.length,
      telegram_ids: telegramEmployees.map(emp => emp.telegram_user_id),
      message: "Broadcast queued for delivery"
    });
  } catch (error) {
    logger.error("Error queueing broadcast", error);
    res.status(500).json({ error: "Failed to queue broadcast" });
  }
});

export default router;
