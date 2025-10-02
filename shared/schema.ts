import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  uuid, 
  timestamp, 
  integer, 
  date,
  jsonb,
  bigserial,
  unique
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Компания
export const company = pgTable("company", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Europe/Amsterdam"),
  locale: text("locale").notNull().default("ru"),
  privacy_settings: jsonb("privacy_settings").notNull().default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
});

// Администраторы (Supabase Auth)
export const admin_user = pgTable("admin_user", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  company_id: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Сотрудники
export const employee = pgTable("employee", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  company_id: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  full_name: text("full_name").notNull(),
  position: text("position"),
  telegram_user_id: text("telegram_user_id").unique(),
  status: text("status").notNull().default("active"),
  tz: text("tz"),
  created_at: timestamp("created_at").defaultNow(),
});

// Инвайты для сотрудников
export const employee_invite = pgTable("employee_invite", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  company_id: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  full_name: text("full_name"),
  position: text("position"),
  created_at: timestamp("created_at").defaultNow(),
  used_by_employee: uuid("used_by_employee").references(() => employee.id),
  used_at: timestamp("used_at"),
});

// Шаблоны графиков
export const schedule_template = pgTable("schedule_template", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  company_id: uuid("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rules: jsonb("rules").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Назначения графиков сотрудникам
export const employee_schedule = pgTable("employee_schedule", {
  employee_id: uuid("employee_id").references(() => employee.id, { onDelete: "cascade" }),
  schedule_id: uuid("schedule_id").references(() => schedule_template.id, { onDelete: "cascade" }),
  valid_from: date("valid_from").notNull(),
  valid_to: date("valid_to"),
}, (table) => ({
  pk: unique().on(table.employee_id, table.valid_from),
}));

// Смены
export const shift = pgTable("shift", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employee_id: uuid("employee_id").notNull().references(() => employee.id, { onDelete: "cascade" }),
  planned_start_at: timestamp("planned_start_at").notNull(),
  planned_end_at: timestamp("planned_end_at").notNull(),
  actual_start_at: timestamp("actual_start_at"),
  actual_end_at: timestamp("actual_end_at"),
  status: text("status").notNull().default("planned"),
  created_at: timestamp("created_at").defaultNow(),
});

// Рабочие интервалы
export const work_interval = pgTable("work_interval", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  shift_id: uuid("shift_id").notNull().references(() => shift.id, { onDelete: "cascade" }),
  start_at: timestamp("start_at").notNull(),
  end_at: timestamp("end_at"),
  source: text("source").notNull().default("bot"),
});

// Перерывы
export const break_interval = pgTable("break_interval", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  shift_id: uuid("shift_id").notNull().references(() => shift.id, { onDelete: "cascade" }),
  start_at: timestamp("start_at").notNull(),
  end_at: timestamp("end_at"),
  type: text("type").notNull().default("lunch"),
  source: text("source").notNull().default("auto"),
});

// Ежедневные отчеты
export const daily_report = pgTable("daily_report", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  shift_id: uuid("shift_id").notNull().references(() => shift.id, { onDelete: "cascade" }),
  planned_items: text("planned_items").array(),
  done_items: text("done_items").array(),
  blockers: text("blockers"),
  tasks_links: text("tasks_links").array(),
  time_spent: jsonb("time_spent"),
  attachments: jsonb("attachments"),
  submitted_at: timestamp("submitted_at"),
});

// Исключения/сигналы
export const exception = pgTable("exception", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employee_id: uuid("employee_id").notNull().references(() => employee.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kind: text("kind").notNull(),
  severity: integer("severity").notNull().default(1),
  details: jsonb("details"),
  resolved_at: timestamp("resolved_at"),
});

// Напоминания
export const reminder = pgTable("reminder", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employee_id: uuid("employee_id").notNull().references(() => employee.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  planned_at: timestamp("planned_at").notNull(),
  sent_at: timestamp("sent_at"),
});

// Аудит
export const audit_log = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: timestamp("at").defaultNow(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  payload: jsonb("payload"),
});

// Insert Schemas
export const insertCompanySchema = createInsertSchema(company).omit({
  id: true,
  created_at: true,
});

export const insertAdminUserSchema = createInsertSchema(admin_user).omit({
  id: true,
  created_at: true,
});

export const insertEmployeeSchema = createInsertSchema(employee).omit({
  id: true,
  created_at: true,
});

export const insertEmployeeInviteSchema = createInsertSchema(employee_invite).omit({
  id: true,
  created_at: true,
  used_by_employee: true,
  used_at: true,
});

export const insertScheduleTemplateSchema = createInsertSchema(schedule_template).omit({
  id: true,
  created_at: true,
});

export const insertEmployeeScheduleSchema = createInsertSchema(employee_schedule);

export const insertShiftSchema = createInsertSchema(shift).omit({
  id: true,
  created_at: true,
});

export const insertWorkIntervalSchema = createInsertSchema(work_interval);

export const insertBreakIntervalSchema = createInsertSchema(break_interval);

export const insertDailyReportSchema = createInsertSchema(daily_report);

export const insertExceptionSchema = createInsertSchema(exception);

export const insertReminderSchema = createInsertSchema(reminder);

export const insertAuditLogSchema = createInsertSchema(audit_log);

// Type definitions
export type Company = typeof company.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type AdminUser = typeof admin_user.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type Employee = typeof employee.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type EmployeeInvite = typeof employee_invite.$inferSelect;
export type InsertEmployeeInvite = z.infer<typeof insertEmployeeInviteSchema>;

export type ScheduleTemplate = typeof schedule_template.$inferSelect;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;

export type EmployeeSchedule = typeof employee_schedule.$inferSelect;
export type InsertEmployeeSchedule = z.infer<typeof insertEmployeeScheduleSchema>;

export type Shift = typeof shift.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type WorkInterval = typeof work_interval.$inferSelect;
export type InsertWorkInterval = z.infer<typeof insertWorkIntervalSchema>;

export type BreakInterval = typeof break_interval.$inferSelect;
export type InsertBreakInterval = z.infer<typeof insertBreakIntervalSchema>;

export type DailyReport = typeof daily_report.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;

export type Exception = typeof exception.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;

export type Reminder = typeof reminder.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

export type AuditLog = typeof audit_log.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
