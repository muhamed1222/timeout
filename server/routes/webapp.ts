import { Router, type Request, type Response, type NextFunction } from "express";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { validateTelegramWebAppData } from "../services/telegramAuth.js";
import { getSecret, isDevelopment } from '../lib/secrets.js';
import type { Shift, WorkInterval, BreakInterval } from "../../shared/schema.js";

const router = Router();

// Extend Request type to include telegramUser
declare module 'express-serve-static-core' {
  interface Request {
    telegramUser?: any;
  }
}

// Middleware для аутентификации Telegram WebApp

function authenticateTelegramWebApp(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'];
  const botToken = getSecret('TELEGRAM_BOT_TOKEN');
  
  // В development режиме без токена разрешаем запросы
  if (!botToken && isDevelopment()) {
    logger.warn('TELEGRAM_BOT_TOKEN not set - skipping WebApp auth validation (development mode)');
    return next();
  }
  
  if (!initData) {
    // Если нет initData, проверяем telegramId в body/params
    const telegramId = req.body.telegramId || req.params.telegramId;
    if (telegramId && isDevelopment()) {
      logger.warn(`Development mode: accepting request with telegramId ${telegramId}`);
      return next();
    }
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }
  
  if (!botToken) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }
  
  // Convert initData to string if it's an array
  const initDataString = Array.isArray(initData) ? initData[0] : initData;
  
  const user = validateTelegramWebAppData(initDataString, botToken);
  if (!user) {
    return res.status(401).json({ error: 'Invalid Telegram signature' });
  }
  
  req.telegramUser = user;
  next();
}

// Вспомогательная функция для определения статуса сотрудника
function getEmployeeStatus(
  activeShift: Shift | undefined,
  workIntervals: WorkInterval[],
  breakIntervals: BreakInterval[]
) {
  if (!activeShift) {
    return 'off_work';
  }
  
  const activeBreak = breakIntervals.find(bi => bi.start_at && !bi.end_at);
  if (activeBreak) {
    return 'on_break';
  }
  
  const activeWork = workIntervals.find(wi => wi.start_at && !wi.end_at);
  if (activeWork) {
    return 'working';
  }
  
  return 'unknown';
}

/**
 * GET /api/webapp/employee/:telegramId
 * Получить информацию о сотруднике и его текущей смене
 */
router.get("/employee/:telegramId", authenticateTelegramWebApp, async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    // Найти сотрудника по telegram_user_id
    const employee = await repositories.employee.findByTelegramId(telegramId);
    
    if (!employee) {
      return res.status(404).json({ 
        error: "Employee not found",
        message: "Сотрудник не найден. Обратитесь к администратору."
      });
    }
    
    // Получить активную смену сотрудника
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const shifts = await repositories.shift.findByEmployeeIdAndDateRange(
      employee.id,
      today,
      tomorrow
    );
    
    const activeShift = shifts.find(s => s.status === 'active' || s.status === 'scheduled');
    
    // Получить интервалы работы и перерывов
    let workIntervals: WorkInterval[] = [];
    let breakIntervals: BreakInterval[] = [];
    
    if (activeShift) {
      workIntervals = await repositories.shift.findWorkIntervalsByShiftId(activeShift.id);
      breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(activeShift.id);
    }
    
    // Определить статус
    const status = getEmployeeStatus(activeShift, workIntervals, breakIntervals);
    
    res.json({
      employee: {
        id: employee.id,
        name: employee.full_name,
        telegram_user_id: employee.telegram_user_id
      },
      activeShift: activeShift || null,
      workIntervals,
      breakIntervals,
      status
    });
  } catch (error) {
    logger.error("Error fetching employee data for WebApp", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/webapp/shift/start
 * Начать смену
 */
router.post("/shift/start", authenticateTelegramWebApp, async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }
    
    // Найти сотрудника
    const employee = await repositories.employee.findByTelegramId(telegramId);
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Проверить, есть ли уже активная смена
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingShifts = await repositories.shift.findByEmployeeIdAndDateRange(
      employee.id,
      today,
      tomorrow
    );
    
    const activeShift = existingShifts.find(s => s.status === 'active');
    
    if (activeShift) {
      return res.status(400).json({ 
        error: "Shift already active",
        message: "У вас уже есть активная смена"
      });
    }
    
    // Найти запланированную смену или создать новую
    let shift = existingShifts.find(s => s.status === 'scheduled');
    
    if (!shift) {
      // Создать новую смену (с текущего времени до конца дня)
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      shift = await repositories.shift.create({
        employee_id: employee.id,
        planned_start_at: now,
        planned_end_at: endOfDay,
        status: 'active'
      });
    } else {
      // Обновить статус запланированной смены
      shift = await repositories.shift.update(shift.id, { 
        status: 'active',
        actual_start_at: new Date()
      });
    }
    
    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }
    
    // Создать интервал работы
    const workInterval = await repositories.shift.createWorkInterval({
      shift_id: shift.id,
      start_at: new Date(),
      source: "webapp"
    });
    
    logger.info(`Shift started via WebApp for employee ${employee.full_name}`, {
      employeeId: employee.id,
      shiftId: shift.id,
      workIntervalId: workInterval.id
    });
    
    res.json({ 
      success: true,
      message: "Смена начата",
      shift,
      workInterval
    });
  } catch (error) {
    logger.error("Error starting shift via WebApp", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/webapp/shift/end
 * Завершить смену
 */
router.post("/shift/end", authenticateTelegramWebApp, async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }
    
    // Найти сотрудника
    const employee = await repositories.employee.findByTelegramId(telegramId);
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Найти активную смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const shifts = await repositories.shift.findByEmployeeIdAndDateRange(
      employee.id,
      today,
      tomorrow
    );
    
    const activeShift = shifts.find(s => s.status === 'active');
    
    if (!activeShift) {
      return res.status(400).json({ 
        error: "No active shift",
        message: "Нет активной смены для завершения"
      });
    }
    
    // Завершить активный интервал работы
    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(activeShift.id);
    const activeWorkInterval = workIntervals.find(wi => !wi.end_at);
    
    if (activeWorkInterval) {
      await repositories.shift.updateWorkInterval(activeWorkInterval.id, { 
        end_at: new Date() 
      });
    }
    
    // Завершить активный перерыв (если есть)
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(activeShift.id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);
    
    if (activeBreak) {
      await repositories.shift.updateBreakInterval(activeBreak.id, { 
        end_at: new Date() 
      });
    }
    
    // Обновить статус смены
    const updatedShift = await repositories.shift.update(activeShift.id, { 
      status: 'completed',
      actual_end_at: new Date()
    });
    
    logger.info(`Shift ended via WebApp for employee ${employee.full_name}`, {
      employeeId: employee.id,
      shiftId: activeShift.id
    });
    
    res.json({ 
      success: true,
      message: "Смена завершена",
      shift: updatedShift
    });
  } catch (error) {
    logger.error("Error ending shift via WebApp", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/webapp/break/start
 * Начать перерыв
 */
router.post("/break/start", authenticateTelegramWebApp, async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }
    
    // Найти сотрудника
    const employee = await repositories.employee.findByTelegramId(telegramId);
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Найти активную смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const shifts = await repositories.shift.findByEmployeeIdAndDateRange(
      employee.id,
      today,
      tomorrow
    );
    
    const activeShift = shifts.find(s => s.status === 'active');
    
    if (!activeShift) {
      return res.status(400).json({ 
        error: "No active shift",
        message: "Нет активной смены"
      });
    }
    
    // Проверить, нет ли уже активного перерыва
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(activeShift.id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);
    
    if (activeBreak) {
      return res.status(400).json({ 
        error: "Break already active",
        message: "Перерыв уже начат"
      });
    }
    
    // Завершить активный интервал работы
    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(activeShift.id);
    const activeWorkInterval = workIntervals.find(wi => !wi.end_at);
    
    if (activeWorkInterval) {
      await repositories.shift.updateWorkInterval(activeWorkInterval.id, { 
        end_at: new Date() 
      });
    }
    
    // Создать интервал перерыва
    const breakInterval = await repositories.shift.createBreakInterval({
      shift_id: activeShift.id,
      start_at: new Date(),
      type: "lunch",
      source: "webapp"
    });
    
    logger.info(`Break started via WebApp for employee ${employee.full_name}`, {
      employeeId: employee.id,
      shiftId: activeShift.id,
      breakIntervalId: breakInterval.id
    });
    
    res.json({ 
      success: true,
      message: "Перерыв начат",
      breakInterval
    });
  } catch (error) {
    logger.error("Error starting break via WebApp", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/webapp/break/end
 * Завершить перерыв
 */
router.post("/break/end", authenticateTelegramWebApp, async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }
    
    // Найти сотрудника
    const employee = await repositories.employee.findByTelegramId(telegramId);
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Найти активную смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const shifts = await repositories.shift.findByEmployeeIdAndDateRange(
      employee.id,
      today,
      tomorrow
    );
    
    const activeShift = shifts.find(s => s.status === 'active');
    
    if (!activeShift) {
      return res.status(400).json({ 
        error: "No active shift",
        message: "Нет активной смены"
      });
    }
    
    // Найти активный перерыв
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(activeShift.id);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);
    
    if (!activeBreak) {
      return res.status(400).json({ 
        error: "No active break",
        message: "Нет активного перерыва"
      });
    }
    
    // Завершить перерыв
    await repositories.shift.updateBreakInterval(activeBreak.id, { 
      end_at: new Date() 
    });
    
    // Начать новый интервал работы
    const workInterval = await repositories.shift.createWorkInterval({
      shift_id: activeShift.id,
      start_at: new Date(),
      source: "webapp"
    });
    
    logger.info(`Break ended via WebApp for employee ${employee.full_name}`, {
      employeeId: employee.id,
      shiftId: activeShift.id,
      workIntervalId: workInterval.id
    });
    
    res.json({ 
      success: true,
      message: "Перерыв завершен, работа возобновлена",
      workInterval
    });
  } catch (error) {
    logger.error("Error ending break via WebApp", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

