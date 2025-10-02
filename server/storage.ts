import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, or, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  type Company, type InsertCompany,
  type Employee, type InsertEmployee,
  type Shift, type InsertShift,
  type WorkInterval, type InsertWorkInterval,
  type BreakInterval, type InsertBreakInterval,
  type DailyReport, type InsertDailyReport,
  type Exception, type InsertException,
  type Reminder, type InsertReminder,
  type EmployeeInvite, type InsertEmployeeInvite,
  type ScheduleTemplate, type InsertScheduleTemplate,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";

// Initialize database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false 
});
const db = drizzle(client, { schema });

export interface IStorage {
  // Companies
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  
  // Employees
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByTelegramId(telegramId: string): Promise<Employee | undefined>;
  getEmployeesByCompany(companyId: string): Promise<Employee[]>;
  updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined>;
  
  // Employee Invites
  createEmployeeInvite(invite: InsertEmployeeInvite): Promise<EmployeeInvite>;
  getEmployeeInviteByCode(code: string): Promise<EmployeeInvite | undefined>;
  useEmployeeInvite(code: string, employeeId: string): Promise<EmployeeInvite | undefined>;
  updateEmployeeInvite(code: string, updates: Partial<InsertEmployeeInvite>): Promise<EmployeeInvite | undefined>;
  
  // Shifts
  createShift(shift: InsertShift): Promise<Shift>;
  getShift(id: string): Promise<Shift | undefined>;
  getShiftsByEmployee(employeeId: string, limit?: number): Promise<Shift[]>;
  getActiveShiftsByCompany(companyId: string): Promise<(Shift & { employee: Employee })[]>;
  updateShift(id: string, updates: Partial<InsertShift>): Promise<Shift | undefined>;
  
  // Work Intervals
  createWorkInterval(interval: InsertWorkInterval): Promise<WorkInterval>;
  getWorkIntervalsByShift(shiftId: string): Promise<WorkInterval[]>;
  updateWorkInterval(id: string, updates: Partial<InsertWorkInterval>): Promise<WorkInterval | undefined>;
  
  // Break Intervals
  createBreakInterval(interval: InsertBreakInterval): Promise<BreakInterval>;
  getBreakIntervalsByShift(shiftId: string): Promise<BreakInterval[]>;
  updateBreakInterval(id: string, updates: Partial<InsertBreakInterval>): Promise<BreakInterval | undefined>;
  
  // Daily Reports
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  getDailyReportByShift(shiftId: string): Promise<DailyReport | undefined>;
  getDailyReportsByCompany(companyId: string, limit?: number): Promise<(DailyReport & { shift: Shift; employee: Employee })[]>;
  
  // Exceptions
  createException(exception: InsertException): Promise<Exception>;
  getExceptionsByCompany(companyId: string): Promise<(Exception & { employee: Employee })[]>;
  resolveException(id: string): Promise<Exception | undefined>;
  
  // Reminders
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getPendingReminders(beforeTime?: Date): Promise<(Reminder & { employee: Employee })[]>;
  markReminderSent(id: string): Promise<Reminder | undefined>;
  
  // Audit Log
  logAudit(log: InsertAuditLog): Promise<AuditLog>;
  
  // Schedule Templates
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  getScheduleTemplatesByCompany(companyId: string): Promise<ScheduleTemplate[]>;
}

export class PostgresStorage implements IStorage {
  // Companies
  async createCompany(company: InsertCompany): Promise<Company> {
    const [result] = await db.insert(schema.company).values(company).returning();
    return result;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [result] = await db.select().from(schema.company).where(eq(schema.company.id, id));
    return result;
  }

  async getAllCompanies(): Promise<Company[]> {
    return db.select().from(schema.company);
  }

  // Employees
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [result] = await db.insert(schema.employee).values(employee).returning();
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [result] = await db.select().from(schema.employee).where(eq(schema.employee.id, id));
    return result;
  }

  async getEmployeeByTelegramId(telegramId: string): Promise<Employee | undefined> {
    const [result] = await db.select().from(schema.employee)
      .where(eq(schema.employee.telegram_user_id, telegramId));
    return result;
  }

  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    return db.select().from(schema.employee)
      .where(eq(schema.employee.company_id, companyId));
  }

  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [result] = await db.update(schema.employee)
      .set(updates)
      .where(eq(schema.employee.id, id))
      .returning();
    return result;
  }

  // Employee Invites
  async createEmployeeInvite(invite: InsertEmployeeInvite): Promise<EmployeeInvite> {
    const [result] = await db.insert(schema.employee_invite).values(invite).returning();
    return result;
  }

  async getEmployeeInviteByCode(code: string): Promise<EmployeeInvite | undefined> {
    const [result] = await db.select().from(schema.employee_invite)
      .where(eq(schema.employee_invite.code, code));
    return result;
  }

  async useEmployeeInvite(code: string, employeeId: string): Promise<EmployeeInvite | undefined> {
    const [result] = await db.update(schema.employee_invite)
      .set({ 
        used_by_employee: employeeId, 
        used_at: sql`now()` 
      })
      .where(and(
        eq(schema.employee_invite.code, code),
        sql`${schema.employee_invite.used_by_employee} IS NULL`
      ))
      .returning();
    return result;
  }

  async updateEmployeeInvite(code: string, updates: Partial<InsertEmployeeInvite>): Promise<EmployeeInvite | undefined> {
    const [result] = await db.update(schema.employee_invite)
      .set(updates)
      .where(eq(schema.employee_invite.code, code))
      .returning();
    return result;
  }

  // Shifts
  async createShift(shift: InsertShift): Promise<Shift> {
    const [result] = await db.insert(schema.shift).values(shift).returning();
    return result;
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const [result] = await db.select().from(schema.shift).where(eq(schema.shift.id, id));
    return result;
  }

  async getShiftsByEmployee(employeeId: string, limit = 10): Promise<Shift[]> {
    return db.select().from(schema.shift)
      .where(eq(schema.shift.employee_id, employeeId))
      .orderBy(sql`${schema.shift.planned_start_at} DESC`)
      .limit(limit);
  }

  async getActiveShiftsByCompany(companyId: string): Promise<(Shift & { employee: Employee })[]> {
    return db.select({
      id: schema.shift.id,
      employee_id: schema.shift.employee_id,
      planned_start_at: schema.shift.planned_start_at,
      planned_end_at: schema.shift.planned_end_at,
      actual_start_at: schema.shift.actual_start_at,
      actual_end_at: schema.shift.actual_end_at,
      status: schema.shift.status,
      created_at: schema.shift.created_at,
      employee: {
        id: schema.employee.id,
        company_id: schema.employee.company_id,
        full_name: schema.employee.full_name,
        position: schema.employee.position,
        telegram_user_id: schema.employee.telegram_user_id,
        status: schema.employee.status,
        tz: schema.employee.tz,
        created_at: schema.employee.created_at
      }
    })
    .from(schema.shift)
    .innerJoin(schema.employee, eq(schema.shift.employee_id, schema.employee.id))
    .where(and(
      eq(schema.employee.company_id, companyId),
      or(
        eq(schema.shift.status, 'planned'),
        eq(schema.shift.status, 'active')
      )
));
  }

  async updateShift(id: string, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const [result] = await db.update(schema.shift)
      .set(updates)
      .where(eq(schema.shift.id, id))
      .returning();
    return result;
  }

  // Work Intervals
  async createWorkInterval(interval: InsertWorkInterval): Promise<WorkInterval> {
    const [result] = await db.insert(schema.work_interval).values(interval).returning();
    return result;
  }

  async getWorkIntervalsByShift(shiftId: string): Promise<WorkInterval[]> {
    return db.select().from(schema.work_interval)
      .where(eq(schema.work_interval.shift_id, shiftId))
      .orderBy(schema.work_interval.start_at);
  }

  async updateWorkInterval(id: string, updates: Partial<InsertWorkInterval>): Promise<WorkInterval | undefined> {
    const [result] = await db.update(schema.work_interval)
      .set(updates)
      .where(eq(schema.work_interval.id, id))
      .returning();
    return result;
  }

  // Break Intervals
  async createBreakInterval(interval: InsertBreakInterval): Promise<BreakInterval> {
    const [result] = await db.insert(schema.break_interval).values(interval).returning();
    return result;
  }

  async getBreakIntervalsByShift(shiftId: string): Promise<BreakInterval[]> {
    return db.select().from(schema.break_interval)
      .where(eq(schema.break_interval.shift_id, shiftId))
      .orderBy(schema.break_interval.start_at);
  }

  async updateBreakInterval(id: string, updates: Partial<InsertBreakInterval>): Promise<BreakInterval | undefined> {
    const [result] = await db.update(schema.break_interval)
      .set(updates)
      .where(eq(schema.break_interval.id, id))
      .returning();
    return result;
  }

  // Daily Reports
  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const [result] = await db.insert(schema.daily_report).values(report).returning();
    return result;
  }

  async getDailyReportByShift(shiftId: string): Promise<DailyReport | undefined> {
    const [result] = await db.select().from(schema.daily_report)
      .where(eq(schema.daily_report.shift_id, shiftId));
    return result;
  }

  async getDailyReportsByCompany(companyId: string, limit = 50): Promise<(DailyReport & { shift: Shift; employee: Employee })[]> {
    return db.select({
      id: schema.daily_report.id,
      shift_id: schema.daily_report.shift_id,
      planned_items: schema.daily_report.planned_items,
      done_items: schema.daily_report.done_items,
      blockers: schema.daily_report.blockers,
      tasks_links: schema.daily_report.tasks_links,
      time_spent: schema.daily_report.time_spent,
      attachments: schema.daily_report.attachments,
      submitted_at: schema.daily_report.submitted_at,
      shift: {
        id: schema.shift.id,
        employee_id: schema.shift.employee_id,
        planned_start_at: schema.shift.planned_start_at,
        planned_end_at: schema.shift.planned_end_at,
        actual_start_at: schema.shift.actual_start_at,
        actual_end_at: schema.shift.actual_end_at,
        status: schema.shift.status,
        created_at: schema.shift.created_at
      },
      employee: {
        id: schema.employee.id,
        company_id: schema.employee.company_id,
        full_name: schema.employee.full_name,
        position: schema.employee.position,
        telegram_user_id: schema.employee.telegram_user_id,
        status: schema.employee.status,
        tz: schema.employee.tz,
        created_at: schema.employee.created_at
      }
    })
    .from(schema.daily_report)
    .innerJoin(schema.shift, eq(schema.daily_report.shift_id, schema.shift.id))
    .innerJoin(schema.employee, eq(schema.shift.employee_id, schema.employee.id))
    .where(eq(schema.employee.company_id, companyId))
    .orderBy(sql`${schema.daily_report.submitted_at} DESC`)
    .limit(limit);
  }

  // Exceptions
  async createException(exception: InsertException): Promise<Exception> {
    const [result] = await db.insert(schema.exception).values(exception).returning();
    return result;
  }

  async getExceptionsByCompany(companyId: string): Promise<(Exception & { employee: Employee })[]> {
    return db.select({
      id: schema.exception.id,
      employee_id: schema.exception.employee_id,
      date: schema.exception.date,
      kind: schema.exception.kind,
      severity: schema.exception.severity,
      details: schema.exception.details,
      resolved_at: schema.exception.resolved_at,
      employee: {
        id: schema.employee.id,
        company_id: schema.employee.company_id,
        full_name: schema.employee.full_name,
        position: schema.employee.position,
        telegram_user_id: schema.employee.telegram_user_id,
        status: schema.employee.status,
        tz: schema.employee.tz,
        created_at: schema.employee.created_at
      }
    })
    .from(schema.exception)
    .innerJoin(schema.employee, eq(schema.exception.employee_id, schema.employee.id))
    .where(eq(schema.employee.company_id, companyId))
    .orderBy(sql`${schema.exception.date} DESC`);
  }

  async resolveException(id: string): Promise<Exception | undefined> {
    const [result] = await db.update(schema.exception)
      .set({ resolved_at: sql`now()` })
      .where(eq(schema.exception.id, id))
      .returning();
    return result;
  }

  // Reminders
  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [result] = await db.insert(schema.reminder).values(reminder).returning();
    return result;
  }

  async getPendingReminders(beforeTime?: Date): Promise<(Reminder & { employee: Employee })[]> {
    const timeFilter = beforeTime || new Date();
    return db.select({
      id: schema.reminder.id,
      employee_id: schema.reminder.employee_id,
      type: schema.reminder.type,
      planned_at: schema.reminder.planned_at,
      sent_at: schema.reminder.sent_at,
      employee: {
        id: schema.employee.id,
        company_id: schema.employee.company_id,
        full_name: schema.employee.full_name,
        position: schema.employee.position,
        telegram_user_id: schema.employee.telegram_user_id,
        status: schema.employee.status,
        tz: schema.employee.tz,
        created_at: schema.employee.created_at
      }
    })
    .from(schema.reminder)
    .innerJoin(schema.employee, eq(schema.reminder.employee_id, schema.employee.id))
    .where(and(
      sql`${schema.reminder.planned_at} <= ${timeFilter}`,
      sql`${schema.reminder.sent_at} IS NULL`
    ))
    .orderBy(schema.reminder.planned_at);
  }

  async markReminderSent(id: string): Promise<Reminder | undefined> {
    const [result] = await db.update(schema.reminder)
      .set({ sent_at: sql`now()` })
      .where(eq(schema.reminder.id, id))
      .returning();
    return result;
  }

  // Audit Log
  async logAudit(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(schema.audit_log).values(log).returning();
    return result;
  }

  // Schedule Templates
  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [result] = await db.insert(schema.schedule_template).values(template).returning();
    return result;
  }

  async getScheduleTemplatesByCompany(companyId: string): Promise<ScheduleTemplate[]> {
    return db.select().from(schema.schedule_template)
      .where(eq(schema.schedule_template.company_id, companyId));
  }
}

export const storage = new PostgresStorage();
