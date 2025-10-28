import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import {
  insertShiftSchema,
  insertWorkIntervalSchema,
  insertBreakIntervalSchema,
  insertDailyReportSchema,
  insertExceptionSchema,
  insertReminderSchema,
  insertScheduleTemplateSchema,
  insertCompanyViolationRulesSchema,
  insertViolationsSchema,
  insertEmployeeRatingSchema
} from "../shared/schema.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { logger } from "./lib/logger.js";
import { cache } from "./lib/cache.js";
import { shiftMonitor } from "./services/shiftMonitor.js";
import { validateTelegramWebAppData, type TelegramUser } from "./services/telegramAuth.js";

// Import modular routers
import authRouter from "./routes/auth.js";
import companiesRouter from "./routes/companies.js";
import employeesRouter from "./routes/employees.js";
import invitesRouter from "./routes/invites.js";
import schedulesRouter from "./routes/schedules.js";
import ratingRouter from "./routes/rating.js";
import webappRouter from "./routes/webapp.js";

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create request schemas with date coercion for JSON clients
const requestShiftSchema = insertShiftSchema.extend({
  planned_start_at: z.coerce.date(),
  planned_end_at: z.coerce.date()
});

const requestWorkIntervalSchema = insertWorkIntervalSchema.extend({
  start_at: z.coerce.date(),
  end_at: z.coerce.date().optional()
});

const requestBreakIntervalSchema = insertBreakIntervalSchema.extend({
  start_at: z.coerce.date(),
  end_at: z.coerce.date().optional()
});

const requestDailyReportSchema = insertDailyReportSchema.extend({
  submitted_at: z.coerce.date().optional()
});

const requestExceptionSchema = insertExceptionSchema.extend({
  date: z.coerce.date().transform((date: Date) => {
    return date.toISOString().split('T')[0];
  })
});

const requestReminderSchema = insertReminderSchema.extend({
  planned_at: z.coerce.date()
});

// Extend Express Request type to include Telegram user
declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
    }
  }
}

// Helper function to determine employee status
function getEmployeeStatus(activeShift: any, workIntervals: any[], breakIntervals: any[]) {
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

// Middleware for Telegram WebApp authentication
function authenticateTelegramWebApp(req: any, res: any, next: any) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  // In development mode without bot token, allow requests with telegramId
  if (!botToken && process.env.NODE_ENV === 'development') {
    logger.warn('TELEGRAM_BOT_TOKEN not set - skipping WebApp auth validation (development mode)');
    return next();
  }
  
  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }
  
  if (!botToken) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }
  
  const user = validateTelegramWebAppData(initData, botToken);
  if (!user) {
    return res.status(401).json({ error: 'Invalid Telegram signature' });
  }
  
  req.telegramUser = user;
  next();
}

// Функция для автоматической очистки приглашений
async function startInviteCleanup() {
  setInterval(async () => {
    try {
      const deletedCount = await storage.cleanupExpiredInvites();
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired invites`);
      }
    } catch (error) {
      logger.error('Error during invite cleanup', error);
    }
  }, 30 * 1000); // Каждые 30 секунд
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply global rate limiter to all API routes
  app.use("/api", apiLimiter);
  
  // Register modular routers
  app.use("/api/auth", authRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/employee-invites", invitesRouter);
  app.use("/api/schedule-templates", schedulesRouter);
  app.use("/api/rating", ratingRouter);
  app.use("/api/webapp", webappRouter);
  
  // Legacy inline endpoints (to be migrated)
  
  // Get employees by company (company-specific endpoint)
  app.get("/api/companies/:companyId/employees", async (req, res) => {
    try {
      const { companyId } = req.params;
      const employees = await storage.getEmployeesByCompany(companyId);
      res.json(employees);
    } catch (error) {
      logger.error("Error fetching employees", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get schedule templates by company
  app.get("/api/companies/:companyId/schedule-templates", async (req, res) => {
    try {
      const { companyId } = req.params;
      const templates = await storage.getScheduleTemplatesByCompany(companyId);
      res.json(templates);
    } catch (error) {
      logger.error("Error fetching schedule templates", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Employee schedule endpoints
  app.post("/api/employee-schedule", async (req, res) => {
    try {
      const { employee_id, schedule_id, valid_from, valid_to } = req.body;
      if (!employee_id || !schedule_id || !valid_from) {
        return res.status(400).json({ error: "employee_id, schedule_id, and valid_from are required" });
      }
      await storage.assignScheduleToEmployee(
        employee_id, 
        schedule_id, 
        new Date(valid_from),
        valid_to ? new Date(valid_to) : undefined
      );
      res.json({ success: true });
    } catch (error) {
      logger.error("Error assigning schedule to employee", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/:employeeId/schedules", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const schedules = await storage.getEmployeeSchedules(employeeId);
      res.json(schedules);
    } catch (error) {
      logger.error("Error fetching employee schedules", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/:employeeId/active-schedule", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const schedule = await storage.getActiveEmployeeSchedule(employeeId, date);
      res.json(schedule || null);
    } catch (error) {
      logger.error("Error fetching active employee schedule", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // ===== SHIFTS API =====
  app.post("/api/shifts", async (req, res) => {
    try {
      const validatedData = requestShiftSchema.parse(req.body);
      const shift = await storage.createShift(validatedData);
      
      // Invalidate company stats cache
      const employee = await storage.getEmployee(shift.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error("Error creating shift", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.getShift(id);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      logger.error("Error fetching shift", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/:employeeId/shifts", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const shifts = await storage.getShiftsByEmployee(employeeId, limit);
      res.json(shifts);
    } catch (error) {
      logger.error("Error fetching employee shifts", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/shifts/active", async (req, res) => {
    try {
      const { companyId } = req.params;
      const shifts = await storage.getActiveShiftsByCompany(companyId);
      res.json(shifts);
    } catch (error) {
      logger.error("Error fetching active shifts", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = requestShiftSchema.partial().parse(req.body);
      const shift = await storage.updateShift(id, validatedData);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error("Error updating shift", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shift management endpoints
  app.post("/api/shifts/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.updateShift(id, { status: "active" });
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      await storage.createWorkInterval({
        shift_id: id,
        start_at: new Date(),
        source: "bot"
      });
      
      // Invalidate company stats cache
      const employee = await storage.getEmployee(shift.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      res.json({ message: "Shift started successfully", shift });
    } catch (error) {
      logger.error("Error starting shift", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shifts/:id/end", async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.updateShift(id, { status: "completed" });
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      const intervals = await storage.getWorkIntervalsByShift(id);
      const activeInterval = intervals.find(i => !i.end_at);
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, { end_at: new Date() });
      }
      
      // Invalidate company stats cache
      const employee = await storage.getEmployee(shift.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      res.json({ message: "Shift ended successfully", shift });
    } catch (error) {
      logger.error("Error ending shift", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shifts/:id/break/start", async (req, res) => {
    try {
      const { id } = req.params;
      const { type = "lunch" } = req.body;
      
      const intervals = await storage.getWorkIntervalsByShift(id);
      const activeInterval = intervals.find(i => !i.end_at);
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, { end_at: new Date() });
      }
      
      const breakInterval = await storage.createBreakInterval({
        shift_id: id,
        start_at: new Date(),
        type,
        source: "bot"
      });
      
      res.json({ message: "Break started successfully", breakInterval });
    } catch (error) {
      logger.error("Error starting break", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shifts/:id/break/end", async (req, res) => {
    try {
      const { id } = req.params;
      
      const breaks = await storage.getBreakIntervalsByShift(id);
      const activeBreak = breaks.find(b => !b.end_at);
      if (!activeBreak) {
        return res.status(400).json({ error: "No active break found" });
      }
      
      await storage.updateBreakInterval(activeBreak.id, { end_at: new Date() });
      
      const workInterval = await storage.createWorkInterval({
        shift_id: id,
        start_at: new Date(),
        source: "bot"
      });
      
      res.json({ message: "Break ended successfully", workInterval });
    } catch (error) {
      logger.error("Error ending break", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== WORK INTERVALS API =====
  app.post("/api/work-intervals", async (req, res) => {
    try {
      const validatedData = requestWorkIntervalSchema.parse(req.body);
      const interval = await storage.createWorkInterval(validatedData);
      res.json(interval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error("Error creating work interval", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:shiftId/work-intervals", async (req, res) => {
    try {
      const { shiftId } = req.params;
      const intervals = await storage.getWorkIntervalsByShift(shiftId);
      res.json(intervals);
    } catch (error) {
      logger.error("Error fetching work intervals", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/work-intervals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = requestWorkIntervalSchema.partial().parse(req.body);
      const interval = await storage.updateWorkInterval(id, validatedData);
      if (!interval) {
        return res.status(404).json({ error: "Work interval not found" });
      }
      res.json(interval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error("Error updating work interval", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== BREAK INTERVALS API =====
  app.post("/api/break-intervals", async (req, res) => {
    try {
      const validatedData = requestBreakIntervalSchema.parse(req.body);
      const interval = await storage.createBreakInterval(validatedData);
      res.json(interval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      logger.error("Error creating break interval", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:shiftId/break-intervals", async (req, res) => {
    try {
      const { shiftId } = req.params;
      const intervals = await storage.getBreakIntervalsByShift(shiftId);
      res.json(intervals);
    } catch (error) {
      logger.error("Error fetching break intervals", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Continue with all remaining endpoints from routes.legacy.ts...
  // This is a hybrid approach: new modular routers + legacy inline routes
  // TODO: Complete migration of all endpoints to modular routers

  const httpServer = createServer(app);

  // Start invite cleanup
  startInviteCleanup();

  return httpServer;
}
