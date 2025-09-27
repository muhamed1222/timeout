import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCompanySchema, insertEmployeeSchema, insertShiftSchema,
  insertWorkIntervalSchema, insertBreakIntervalSchema,
  insertDailyReportSchema, insertExceptionSchema,
  insertEmployeeInviteSchema, insertReminderSchema
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

import { randomBytes } from "crypto";
import { shiftMonitor } from "./services/shiftMonitor";

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  const httpServer = createServer(app);

  return httpServer;
}
