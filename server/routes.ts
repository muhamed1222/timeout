import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCompanySchema, insertEmployeeSchema, insertShiftSchema,
  insertWorkIntervalSchema, insertBreakIntervalSchema,
  insertDailyReportSchema, insertExceptionSchema,
  insertEmployeeInviteSchema, insertReminderSchema,
  insertScheduleTemplateSchema,
  insertCompanyViolationRulesSchema,
  insertViolationsSchema,
  insertEmployeeRatingSchema
} from "@shared/schema";
import { z } from "zod";

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
    // Convert Date object to YYYY-MM-DD string format for date column
    return date.toISOString().split('T')[0];
  })
});

const requestReminderSchema = insertReminderSchema.extend({
  planned_at: z.coerce.date()
});

const registerAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  company_name: z.string().min(1),
  full_name: z.string().min(1)
});

import { randomBytes } from "crypto";
import { shiftMonitor } from "./services/shiftMonitor";
import { validateTelegramWebAppData, type TelegramUser } from "./services/telegramAuth";
import { handleTelegramMessage } from "./handlers/telegramHandlers";
import { handleTelegramWebhook } from "./telegram/webhook";
import { supabaseAdmin, hasServiceRoleKey } from "./lib/supabase";
import { sendTelegramMessage } from "./handlers/telegramHandlers";

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

// Handler for Telegram callback queries (inline button presses)
async function handleTelegramCallback(callbackQuery: any) {
  console.log("Received callback query:", callbackQuery.data);
  // TODO: Implement callback handling logic when needed
}

// Middleware for Telegram WebApp authentication
function authenticateTelegramWebApp(req: any, res: any, next: any) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  // In development mode without bot token, allow requests with telegramId
  if (!botToken && process.env.NODE_ENV === 'development') {
    console.warn('TELEGRAM_BOT_TOKEN not set - skipping WebApp auth validation (development mode)');
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth API
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerAdminSchema.parse(req.body);
      const { email, password, company_name, full_name } = validatedData;
      
      if (!hasServiceRoleKey) {
        return res.status(500).json({ 
          error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for admin registration" 
        });
      }
      
      const company = await storage.createCompany({ name: company_name });
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          company_id: company.id,
          full_name
        }
      });
      
      if (authError) {
        await storage.deleteCompany(company.id);
        if (authError.message.includes('already registered')) {
          return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
        }
        console.error("Supabase auth error:", authError);
        return res.status(500).json({ error: `Ошибка регистрации: ${authError.message}` });
      }
      
      if (!authData.user) {
        await storage.deleteCompany(company.id);
        return res.status(500).json({ error: "Не удалось создать пользователя" });
      }
      
      res.json({ success: true, company_id: company.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Ошибка валидации", 
          details: error.errors 
        });
      }
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // Companies API
  app.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Периоды рейтинга для UI (текущий месяц, прошлый, квартал, год)
  app.get("/api/rating/periods", async (_req, res) => {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);

      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 12, 0);

      const toYmd = (d: Date) => d.toISOString().split('T')[0];

      const periods = [
        { id: 'current', name: 'Текущий месяц', start_date: toYmd(currentMonthStart), end_date: toYmd(currentMonthEnd) },
        { id: 'last', name: 'Прошлый месяц', start_date: toYmd(lastMonthStart), end_date: toYmd(lastMonthEnd) },
        { id: 'quarter', name: 'Квартал', start_date: toYmd(quarterStart), end_date: toYmd(quarterEnd) },
        { id: 'year', name: 'Год', start_date: toYmd(yearStart), end_date: toYmd(yearEnd) },
      ];

      res.json(periods);
    } catch (error) {
      console.error('Error building rating periods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
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
      console.error("Error updating company:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/stats", async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const employees = await storage.getEmployeesByCompany(companyId);
      const activeShifts = await storage.getActiveShiftsByCompany(companyId);
      const exceptions = await storage.getExceptionsByCompany(companyId);
      
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = activeShifts.filter(shift => 
        shift.planned_start_at.toISOString().split('T')[0] === today
      );
      
      const completedShifts = todayShifts.filter(shift => shift.status === 'completed').length;
      
      res.json({
        totalEmployees: employees.length,
        activeShifts: activeShifts.length,
        completedShifts,
        exceptions: exceptions.length
      });
    } catch (error) {
      console.error("Error fetching company stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Employees API
  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/employees", async (req, res) => {
    try {
      const { companyId } = req.params;
      const employees = await storage.getEmployeesByCompany(companyId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Employee Invites API
  app.post("/api/employee-invites", async (req, res) => {
    try {
      const data = { ...req.body };
      // Generate unique invite code
      data.code = randomBytes(16).toString('hex');
      const validatedData = insertEmployeeInviteSchema.parse(data);
      const invite = await storage.createEmployeeInvite(validatedData);
      res.json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating employee invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employee-invites/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const invite = await storage.getEmployeeInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json(invite);
    } catch (error) {
      console.error("Error fetching employee invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/employee-invites/:code/use", async (req, res) => {
    try {
      const { code } = req.params;
      const { employee_id } = req.body;
      if (!employee_id) {
        return res.status(400).json({ error: "employee_id is required" });
      }
      const invite = await storage.useEmployeeInvite(code, employee_id);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found or already used" });
      }
      res.json(invite);
    } catch (error) {
      console.error("Error using employee invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate Telegram deep link for invite
  app.get("/api/employee-invites/:code/link", async (req, res) => {
    try {
      const { code } = req.params;
      const invite = await storage.getEmployeeInviteByCode(code);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      if (invite.used_at) {
        return res.status(400).json({ error: "Invite already used" });
      }
      
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourBotName';
      const deepLink = `https://t.me/${botUsername}?start=${code}`;
      
      res.json({ 
        code,
        deep_link: deepLink,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`
      });
    } catch (error) {
      console.error("Error generating invite link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Schedule Templates API
  app.post("/api/schedule-templates", async (req, res) => {
    try {
      const validatedData = insertScheduleTemplateSchema.parse(req.body);
      const template = await storage.createScheduleTemplate(validatedData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating schedule template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/schedule-templates", async (req, res) => {
    try {
      const { companyId } = req.params;
      const templates = await storage.getScheduleTemplatesByCompany(companyId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching schedule templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/schedule-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getScheduleTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Schedule template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching schedule template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/schedule-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertScheduleTemplateSchema.partial().parse(req.body);
      const template = await storage.updateScheduleTemplate(id, updates);
      if (!template) {
        return res.status(404).json({ error: "Schedule template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating schedule template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/schedule-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScheduleTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Employee Schedule Assignment
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
      console.error("Error assigning schedule to employee:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/:employeeId/schedules", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const schedules = await storage.getEmployeeSchedules(employeeId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching employee schedules:", error);
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
      console.error("Error fetching active employee schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shifts API
  app.post("/api/shifts", async (req, res) => {
    try {
      const validatedData = requestShiftSchema.parse(req.body);
      const shift = await storage.createShift(validatedData);
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating shift:", error);
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
      console.error("Error fetching shift:", error);
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
      console.error("Error fetching employee shifts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/shifts/active", async (req, res) => {
    try {
      const { companyId } = req.params;
      const shifts = await storage.getActiveShiftsByCompany(companyId);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching active shifts:", error);
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
      console.error("Error updating shift:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Work Intervals API
  app.post("/api/work-intervals", async (req, res) => {
    try {
      const validatedData = requestWorkIntervalSchema.parse(req.body);
      const interval = await storage.createWorkInterval(validatedData);
      res.json(interval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating work interval:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:shiftId/work-intervals", async (req, res) => {
    try {
      const { shiftId } = req.params;
      const intervals = await storage.getWorkIntervalsByShift(shiftId);
      res.json(intervals);
    } catch (error) {
      console.error("Error fetching work intervals:", error);
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
      console.error("Error updating work interval:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Break Intervals API
  app.post("/api/break-intervals", async (req, res) => {
    try {
      const validatedData = requestBreakIntervalSchema.parse(req.body);
      const interval = await storage.createBreakInterval(validatedData);
      res.json(interval);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating break interval:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:shiftId/break-intervals", async (req, res) => {
    try {
      const { shiftId } = req.params;
      const intervals = await storage.getBreakIntervalsByShift(shiftId);
      res.json(intervals);
    } catch (error) {
      console.error("Error fetching break intervals:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Daily Reports API
  app.post("/api/daily-reports", async (req, res) => {
    try {
      const validatedData = requestDailyReportSchema.parse(req.body);
      const report = await storage.createDailyReport(validatedData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating daily report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/shifts/:shiftId/daily-report", async (req, res) => {
    try {
      const { shiftId } = req.params;
      const report = await storage.getDailyReportByShift(shiftId);
      if (!report) {
        return res.status(404).json({ error: "Daily report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching daily report:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/daily-reports", async (req, res) => {
    try {
      const { companyId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const reports = await storage.getDailyReportsByCompany(companyId, limit);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching daily reports:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Exceptions API
  app.post("/api/exceptions", async (req, res) => {
    try {
      const validatedData = requestExceptionSchema.parse(req.body);
      const exception = await storage.createException(validatedData);
      res.json(exception);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating exception:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/exceptions", async (req, res) => {
    try {
      const { companyId } = req.params;
      const exceptions = await storage.getExceptionsByCompany(companyId);
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching exceptions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/exceptions/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const exception = await storage.resolveException(id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      res.json(exception);
    } catch (error) {
      console.error("Error resolving exception:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reminders API
  app.post("/api/reminders", async (req, res) => {
    try {
      const validatedData = requestReminderSchema.parse(req.body);
      const reminder = await storage.createReminder(validatedData);
      res.json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating reminder:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/reminders/pending", async (req, res) => {
    try {
      const beforeTime = req.query.before ? new Date(req.query.before as string) : undefined;
      const reminders = await storage.getPendingReminders(beforeTime);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/reminders/:id/sent", async (req, res) => {
    try {
      const { id } = req.params;
      const reminder = await storage.markReminderSent(id);
      if (!reminder) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error marking reminder as sent:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Telegram Bot API
  app.get("/api/employees/telegram/:telegramUserId", async (req, res) => {
    try {
      const { telegramUserId } = req.params;
      const employee = await storage.getEmployeeByTelegramId(telegramUserId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee by telegram ID:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shift management endpoints for Telegram bot
  app.post("/api/shifts/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.updateShift(id, { status: "active" });
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      // Create work interval
      await storage.createWorkInterval({
        shift_id: id,
        start_at: new Date(),
        source: "bot"
      });
      
      res.json({ message: "Shift started successfully", shift });
    } catch (error) {
      console.error("Error starting shift:", error);
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
      
      // End current work interval if any
      const intervals = await storage.getWorkIntervalsByShift(id);
      const activeInterval = intervals.find(i => !i.end_at);
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, { end_at: new Date() });
      }
      
      res.json({ message: "Shift ended successfully", shift });
    } catch (error) {
      console.error("Error ending shift:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shifts/:id/break/start", async (req, res) => {
    try {
      const { id } = req.params;
      const { type = "lunch" } = req.body;
      
      // End current work interval
      const intervals = await storage.getWorkIntervalsByShift(id);
      const activeInterval = intervals.find(i => !i.end_at);
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, { end_at: new Date() });
      }
      
      // Create break interval
      const breakInterval = await storage.createBreakInterval({
        shift_id: id,
        start_at: new Date(),
        type,
        source: "bot"
      });
      
      res.json({ message: "Break started successfully", breakInterval });
    } catch (error) {
      console.error("Error starting break:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shifts/:id/break/end", async (req, res) => {
    try {
      const { id } = req.params;
      
      // End current break interval
      const breaks = await storage.getBreakIntervalsByShift(id);
      const activeBreak = breaks.find(b => !b.end_at);
      if (!activeBreak) {
        return res.status(400).json({ error: "No active break found" });
      }
      
      await storage.updateBreakInterval(activeBreak.id, { end_at: new Date() });
      
      // Start new work interval
      const workInterval = await storage.createWorkInterval({
        shift_id: id,
        start_at: new Date(),
        source: "bot"
      });
      
      res.json({ message: "Break ended successfully", workInterval });
    } catch (error) {
      console.error("Error ending break:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shift Monitoring API
  app.post("/api/companies/:companyId/monitor", async (req, res) => {
    try {
      const { companyId } = req.params;
      const result = await shiftMonitor.processCompanyShifts(companyId);
      res.json({
        message: "Shift monitoring completed",
        ...result
      });
    } catch (error) {
      console.error("Error in shift monitoring:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/monitor/global", async (req, res) => {
    try {
      const result = await shiftMonitor.runGlobalMonitoring();
      res.json({
        message: "Global shift monitoring completed",
        ...result
      });
    } catch (error) {
      console.error("Error in global monitoring:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/companies/:companyId/violations", async (req, res) => {
    try {
      const { companyId } = req.params;
      const violations = await shiftMonitor.checkShiftViolations(companyId);
      res.json(violations);
    } catch (error) {
      console.error("Error checking violations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Telegram Bot Integration API
  
  // Webhook endpoint for Telegram bot
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const update = req.body;
      
      // Use the new bot handler
      await handleTelegramWebhook(update);
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error handling Telegram webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // WebApp API for Telegram Mini Apps
  
  // Get employee data for WebApp
  app.get("/api/webapp/employee/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const employee = await storage.getEmployeeByTelegramId(telegramId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Get current active shift
      const shifts = await storage.getShiftsByEmployee(employee.id);
      const activeShift = shifts.find(s => s.status === 'active');
      
      // Get work intervals for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayShifts = shifts.filter(s => {
        const shiftDate = new Date(s.planned_start_at);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === today.getTime();
      });
      
      let workIntervals: Awaited<ReturnType<typeof storage.getWorkIntervalsByShift>> = [];
      let breakIntervals: Awaited<ReturnType<typeof storage.getBreakIntervalsByShift>> = [];
      
      if (todayShifts.length > 0) {
        const todayShift = todayShifts[0];
        workIntervals = await storage.getWorkIntervalsByShift(todayShift.id);
        breakIntervals = await storage.getBreakIntervalsByShift(todayShift.id);
      }
      
      res.json({
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          telegram_user_id: employee.telegram_user_id
        },
        activeShift,
        workIntervals,
        breakIntervals,
        status: getEmployeeStatus(activeShift, workIntervals, breakIntervals)
      });
    } catch (error) {
      console.error("Error getting employee data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Start shift via WebApp
  app.post("/api/webapp/shift/start", authenticateTelegramWebApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser?.id?.toString() || req.body.telegramId;
      
      const employee = await storage.getEmployeeByTelegramId(telegramId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Find planned shift for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const shifts = await storage.getShiftsByEmployee(employee.id);
      const todayShift = shifts.find(s => {
        const shiftDate = new Date(s.planned_start_at);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate.getTime() === today.getTime() && s.status === 'planned';
      });
      
      if (!todayShift) {
        return res.status(400).json({ error: "No planned shift found for today" });
      }
      
      // Update shift to active
      const updatedShift = await storage.updateShift(todayShift.id, {
        status: 'active',
        actual_start_at: new Date()
      });
      
      // Create work interval
      const workInterval = await storage.createWorkInterval({
        shift_id: todayShift.id,
        start_at: new Date(),
        source: "webapp"
      });
      
      res.json({
        message: "Shift started successfully",
        shift: updatedShift,
        workInterval
      });
    } catch (error) {
      console.error("Error starting shift:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // End shift via WebApp
  app.post("/api/webapp/shift/end", authenticateTelegramWebApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser?.id?.toString() || req.body.telegramId;
      
      const employee = await storage.getEmployeeByTelegramId(telegramId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Find active shift
      const shifts = await storage.getShiftsByEmployee(employee.id);
      const activeShift = shifts.find(s => s.status === 'active');
      
      if (!activeShift) {
        return res.status(400).json({ error: "No active shift found" });
      }
      
      // End current work interval
      const workIntervals = await storage.getWorkIntervalsByShift(activeShift.id);
      const activeInterval = workIntervals.find(wi => !wi.end_at);
      
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, {
          end_at: new Date()
        });
      }
      
      // Update shift to completed
      const updatedShift = await storage.updateShift(activeShift.id, {
        status: 'completed',
        actual_end_at: new Date()
      });
      
      res.json({
        message: "Shift ended successfully",
        shift: updatedShift
      });
    } catch (error) {
      console.error("Error ending shift:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Start break via WebApp
  app.post("/api/webapp/break/start", authenticateTelegramWebApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser?.id?.toString() || req.body.telegramId;
      
      const employee = await storage.getEmployeeByTelegramId(telegramId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Find active shift
      const shifts = await storage.getShiftsByEmployee(employee.id);
      const activeShift = shifts.find(s => s.status === 'active');
      
      if (!activeShift) {
        return res.status(400).json({ error: "No active shift found" });
      }
      
      // End current work interval
      const workIntervals = await storage.getWorkIntervalsByShift(activeShift.id);
      const activeInterval = workIntervals.find(wi => !wi.end_at);
      
      if (activeInterval) {
        await storage.updateWorkInterval(activeInterval.id, {
          end_at: new Date()
        });
      }
      
      // Create break interval
      const breakInterval = await storage.createBreakInterval({
        shift_id: activeShift.id,
        start_at: new Date(),
        source: "webapp"
      });
      
      res.json({
        message: "Break started successfully",
        breakInterval
      });
    } catch (error) {
      console.error("Error starting break:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // End break via WebApp
  app.post("/api/webapp/break/end", authenticateTelegramWebApp, async (req, res) => {
    try {
      const telegramId = req.telegramUser?.id?.toString() || req.body.telegramId;
      
      const employee = await storage.getEmployeeByTelegramId(telegramId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Find active shift
      const shifts = await storage.getShiftsByEmployee(employee.id);
      const activeShift = shifts.find(s => s.status === 'active');
      
      if (!activeShift) {
        return res.status(400).json({ error: "No active shift found" });
      }
      
      // End current break interval
      const breakIntervals = await storage.getBreakIntervalsByShift(activeShift.id);
      const activeBreak = breakIntervals.find(bi => !bi.end_at);
      
      if (!activeBreak) {
        return res.status(400).json({ error: "No active break found" });
      }
      
      await storage.updateBreakInterval(activeBreak.id, {
        end_at: new Date()
      });
      
      // Start new work interval
      const workInterval = await storage.createWorkInterval({
        shift_id: activeShift.id,
        start_at: new Date(),
        source: "webapp"
      });
      
      res.json({
        message: "Break ended successfully",
        workInterval
      });
    } catch (error) {
      console.error("Error ending break:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Система рейтинга - API endpoints
  
  // Получить правила нарушений компании
  app.get("/api/companies/:companyId/violation-rules", async (req, res) => {
    try {
      const { companyId } = req.params;
      // Проверяем, что компания существует
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      const rules = await storage.getViolationRulesByCompany(companyId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching violation rules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Получить правила нарушений компании
  app.get("/api/companies/:companyId/violation-rules", async (req, res) => {
    try {
      const { companyId } = req.params;
      const rules = await storage.getViolationRulesByCompany(companyId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching violation rules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Request schemas with relaxed/coerced types for penalty_percent
  const requestCreateViolationRuleSchema = insertCompanyViolationRulesSchema.extend({
    penalty_percent: z.union([z.string(), z.number()]).transform((v) =>
      typeof v === 'number' ? v.toString() : v
    ),
  });

  const requestUpdateViolationRuleSchema = insertCompanyViolationRulesSchema.partial().extend({
    penalty_percent: z.union([z.string(), z.number()]).optional().transform((v) =>
      v === undefined ? v : (typeof v === 'number' ? v.toString() : v)
    ),
  });

  // Создать правило нарушения
  app.post("/api/violation-rules", async (req, res) => {
    try {
      const validatedData = requestCreateViolationRuleSchema.parse(req.body);
      // Проверяем, что компания существует
      const company = await storage.getCompany(validatedData.company_id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      // Ensure unique code within the company (case-insensitive)
      const existing = await storage.getViolationRulesByCompany(validatedData.company_id);
      const duplicate = existing.find(r => r.code.trim().toLowerCase() === validatedData.code.trim().toLowerCase());
      if (duplicate) {
        return res.status(409).json({ error: "Rule code must be unique within the company" });
      }
      const rule = await storage.createViolationRule(validatedData as any);
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating violation rule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Обновить правило нарушения
  app.put("/api/violation-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = requestUpdateViolationRuleSchema.parse(req.body);
      // If code or company_id provided, enforce uniqueness
      if (validatedData.code || validatedData.company_id) {
        const current = await storage.getViolationRule(id);
        if (!current) return res.status(404).json({ error: "Violation rule not found" });
        const companyId = validatedData.company_id || current.company_id;
        // Проверяем, что компания существует
        const company = await storage.getCompany(companyId);
        if (!company) {
          return res.status(404).json({ error: "Company not found" });
        }
        const codeToCheck = (validatedData.code || current.code).trim().toLowerCase();
        const existing = await storage.getViolationRulesByCompany(companyId);
        const duplicate = existing.find(r => r.id !== id && r.code.trim().toLowerCase() === codeToCheck);
        if (duplicate) {
          return res.status(409).json({ error: "Rule code must be unique within the company" });
        }
      }
      const rule = await storage.updateViolationRule(id, validatedData as any);
      if (!rule) {
        return res.status(404).json({ error: "Violation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating violation rule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Удалить правило нарушения
  app.delete("/api/violation-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const current = await storage.getViolationRule(id);
      if (!current) {
        return res.status(404).json({ error: "Violation rule not found" });
      }
      await storage.deleteViolationRule(id);
      res.json({ message: "Violation rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting violation rule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Получить нарушения сотрудника
  app.get("/api/employees/:employeeId/violations", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { periodStart, periodEnd } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (periodStart && periodEnd) {
        startDate = new Date(periodStart as string);
        endDate = new Date(periodEnd as string);
      }
      
      const violations = await storage.getViolationsByEmployee(employeeId, startDate, endDate);
      res.json(violations);
    } catch (error) {
      console.error("Error fetching violations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Создать нарушение
  // Создать нарушение (штраф вычисляется по правилу)
  app.post("/api/violations", async (req, res) => {
    try {
      // Прием только базовых полей, без penalty/created_at
      const createViolationRequest = z.object({
        employee_id: z.string().uuid(),
        company_id: z.string().uuid(),
        rule_id: z.string().uuid(),
        source: z.enum(['manual', 'auto']).default('manual'),
        reason: z.string().optional(),
        created_by: z.string().uuid().optional()
      });
      const validatedData = createViolationRequest.parse(req.body);
      // Интегритет: проверяем сотрудника и правило относятся к company_id
      const employee = await storage.getEmployee(validatedData.employee_id);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      const rule = await storage.getViolationRule(validatedData.rule_id);
      if (!rule) return res.status(404).json({ error: 'Violation rule not found' });
      if (employee.company_id !== validatedData.company_id || rule.company_id !== validatedData.company_id) {
        return res.status(403).json({ error: 'Company scope mismatch' });
      }
      // Компания должна существовать
      const company = await storage.getCompany(validatedData.company_id);
      if (!company) return res.status(404).json({ error: 'Company not found' });
      // penalty берём из правила
      const violation = await storage.createViolation({
        employee_id: validatedData.employee_id,
        company_id: validatedData.company_id,
        rule_id: validatedData.rule_id,
        source: validatedData.source,
        reason: validatedData.reason,
        created_by: validatedData.created_by,
        penalty: rule.penalty_percent, // numeric в БД, строка тоже ок для drizzle
      } as any);
      
      // Пересчитываем рейтинг сотрудника
      const employeeAfter = await storage.getEmployee(violation.employee_id);
      if (employeeAfter) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const updatedRating = await storage.updateEmployeeRatingFromViolations(
          violation.employee_id, 
          periodStart, 
          periodEnd
        );

        // Уведомления в Telegram
        const chatId = employeeAfter.telegram_user_id ? Number(employeeAfter.telegram_user_id) : undefined;
        const ratingNum = Number(updatedRating.rating);
        if (chatId && !Number.isNaN(ratingNum)) {
          // Сообщение о нарушении
          const reason = violation.reason ? ` Причина: ${violation.reason}.` : '';
          await sendTelegramMessage(
            chatId,
            `❗ Зафиксировано нарушение. Рейтинг −${violation.penalty}%.
Текущий рейтинг: ${Math.max(0, Math.round(ratingNum))}%.${reason}`
          );

          if (ratingNum <= 30) {
            // Уведомление о блокировке
            await sendTelegramMessage(
              chatId,
              `🚫 Ваш аккаунт заблокирован. Рейтинг опустился до ${Math.max(0, Math.round(ratingNum))}%.
Обратитесь к руководителю.`
            );
          } else if (ratingNum <= 35) {
            // Предупреждение о критическом уровне
            await sendTelegramMessage(
              chatId,
              `⚠️ Критический уровень. Ваш рейтинг ${Math.max(0, Math.round(ratingNum))}%. Ещё одно нарушение может привести к блокировке.`
            );
          }
        }
      }
      
      res.json(violation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating violation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Получить рейтинги сотрудников компании
  app.get("/api/companies/:companyId/ratings", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { periodStart, periodEnd } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (periodStart && periodEnd) {
        startDate = new Date(periodStart as string);
        endDate = new Date(periodEnd as string);
      }
      
      const ratings = await storage.getEmployeeRatingsByCompany(companyId, startDate, endDate);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Пересчитать рейтинги всех сотрудников компании за текущий месяц
  app.post("/api/companies/:companyId/ratings/recalculate", async (req, res) => {
    try {
      const { companyId } = req.params;
      const employees = await storage.getEmployeesByCompany(companyId);
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const results = [] as any[];
      for (const emp of employees) {
        const rating = await storage.updateEmployeeRatingFromViolations(emp.id, periodStart, periodEnd);
        results.push({ employee_id: emp.id, rating });
      }

      res.json({ message: 'Пересчет завершен', count: results.length });
    } catch (error) {
      console.error("Error recalculating ratings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Глобальный пересчет рейтингов за указанный или текущий период по всем компаниям
  app.post("/api/ratings/recalculate", async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.body || {};
      const now = new Date();
      const start = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = periodEnd ? new Date(periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const companies = await storage.getAllCompanies();
      let processed = 0;
      for (const company of companies) {
        const employees = await storage.getEmployeesByCompany(company.id);
        for (const emp of employees) {
          await storage.updateEmployeeRatingFromViolations(emp.id, start, end);
          processed += 1;
        }
      }

      res.json({ message: 'Глобальный пересчет завершен', processed, periodStart: start.toISOString().split('T')[0], periodEnd: end.toISOString().split('T')[0] });
    } catch (error) {
      console.error("Error recalculating ratings globally:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Получить рейтинг конкретного сотрудника
  app.get("/api/employees/:employeeId/rating", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { periodStart, periodEnd } = req.query;
      
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: "periodStart and periodEnd are required" });
      }
      
      const startDate = new Date(periodStart as string);
      const endDate = new Date(periodEnd as string);
      
      const rating = await storage.getEmployeeRating(employeeId, startDate, endDate);
      if (!rating) {
        return res.status(404).json({ error: "Rating not found" });
      }
      
      res.json(rating);
    } catch (error) {
      console.error("Error fetching employee rating:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Пересчитать рейтинг сотрудника
  app.post("/api/employees/:employeeId/rating/recalculate", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { periodStart, periodEnd } = req.body;
      
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: "periodStart and periodEnd are required" });
      }
      
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      
      const rating = await storage.updateEmployeeRatingFromViolations(employeeId, startDate, endDate);
      res.json(rating);
    } catch (error) {
      console.error("Error recalculating rating:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
