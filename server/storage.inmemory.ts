import type { IStorage } from './storage.js';
import type {
  Company, InsertCompany,
  Employee, InsertEmployee,
  Shift, InsertShift,
  WorkInterval, InsertWorkInterval,
  BreakInterval, InsertBreakInterval,
  DailyReport, InsertDailyReport,
  Exception, InsertException,
  Reminder, InsertReminder,
  EmployeeInvite, InsertEmployeeInvite,
  ScheduleTemplate, InsertScheduleTemplate,
  AuditLog, InsertAuditLog,
  CompanyViolationRules, InsertCompanyViolationRules,
  Violations, InsertViolations,
  EmployeeRating, InsertEmployeeRating
} from '../shared/schema.js';

function nowIso() { return new Date().toISOString(); }

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export class InMemoryStorage implements IStorage {
  private companies = new Map<string, Company>();
  private employees = new Map<string, Employee>();
  private shifts = new Map<string, Shift>();
  private workIntervals = new Map<string, WorkInterval>();
  private breakIntervals = new Map<string, BreakInterval>();
  private dailyReports = new Map<string, DailyReport>();
  private exceptions = new Map<string, Exception>();
  private reminders = new Map<string, Reminder>();
  private invites = new Map<string, EmployeeInvite>();
  private schedules = new Map<string, ScheduleTemplate>();
  private employeeSchedules: Array<{ employee_id: string; schedule_id: string; valid_from: string; valid_to: string | null; }> = [];
  private violationRules = new Map<string, CompanyViolationRules>();
  private violations = new Map<string, Violations>();
  private ratings = new Map<string, EmployeeRating>();

  constructor() {
    // Seed a demo company with the ID used by the frontend
    const demoCompanyId = '9ea111ce-ad0f-4758-98cd-60a9ca876f55';
    this.companies.set(demoCompanyId, {
      id: demoCompanyId,
      name: 'Demo Company',
      timezone: 'Europe/Amsterdam' as any,
      locale: 'ru' as any,
      privacy_settings: {} as any,
      created_at: new Date() as any,
    } as Company);

    // Seed demo employees
    const emp1: Employee = {
      id: 'emp-1',
      company_id: demoCompanyId,
      full_name: 'Иван Иванов',
      position: 'Сотрудник',
      status: 'active',
      telegram_user_id: null as any,
      tz: 'UTC' as any,
      created_at: nowIso() as any
    } as any;
    this.employees.set(emp1.id, emp1);

    // Seed a violation rule
    const rule1: CompanyViolationRules = {
      id: 'rule-1',
      company_id: demoCompanyId,
      code: 'late',
      name: 'Опоздание',
      penalty_percent: '5' as any,
      auto_detectable: false as any,
      is_active: true as any,
      created_at: nowIso() as any
    } as any;
    this.violationRules.set(rule1.id, rule1);
  }

  // Companies
  async createCompany(company: InsertCompany): Promise<Company> {
    const id = genId('comp');
    const row: Company = {
      id,
      name: company.name,
      timezone: (company as any).timezone || 'Europe/Amsterdam',
      locale: (company as any).locale || 'ru',
      privacy_settings: (company as any).privacy_settings || {},
      created_at: new Date() as any,
    } as Company;
    this.companies.set(id, row);
    return row;
  }
  async getCompany(id: string): Promise<Company | undefined> { return this.companies.get(id); }
  async getAllCompanies(): Promise<Company[]> { return Array.from(this.companies.values()); }
  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const row = this.companies.get(id);
    if (!row) return undefined;
    const updated = {
      ...row,
      ...updates,
    } as any as Company;
    this.companies.set(id, updated);
    return updated;
  }
  async deleteCompany(companyId: string): Promise<void> { this.companies.delete(companyId); }

  // Employees
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const id = genId('emp');
    const row: Employee = { id, company_id: employee.company_id, full_name: employee.full_name, status: employee.status || 'active', created_at: nowIso(), position: employee.position || null, telegram_user_id: employee.telegram_user_id || null, tz: employee.tz || 'UTC' } as any;
    this.employees.set(id, row);
    return row;
  }
  async getEmployee(id: string): Promise<Employee | undefined> { return this.employees.get(id); }
  async getEmployeeByTelegramId(telegramId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(e => e.telegram_user_id === telegramId);
  }
  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(e => e.company_id === companyId);
  }
  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const row = this.employees.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as Employee;
    this.employees.set(id, updated);
    return updated;
  }
  async deleteEmployee(id: string): Promise<void> { this.employees.delete(id); }

  // Invites
  async createEmployeeInvite(invite: InsertEmployeeInvite): Promise<EmployeeInvite> {
    const id = genId('inv');
    const row: EmployeeInvite = { id, ...invite, created_at: nowIso(), used_at: null } as any;
    this.invites.set(id, row);
    return row;
  }
  async getEmployeeInviteByCode(code: string): Promise<EmployeeInvite | undefined> {
    return Array.from(this.invites.values()).find(i => i.code === code);
  }
  async getEmployeeInvitesByCompany(companyId: string): Promise<EmployeeInvite[]> {
    return Array.from(this.invites.values()).filter(i => i.company_id === companyId);
  }
  async deleteEmployeeInvite(id: string): Promise<void> { this.invites.delete(id); }
  async cleanupExpiredInvites(): Promise<number> { return 0; }
  async useEmployeeInvite(code: string, employeeId: string): Promise<EmployeeInvite | undefined> {
    const inv = await this.getEmployeeInviteByCode(code);
    if (!inv || inv.used_by_employee) return undefined;
    const updated = { ...inv, used_by_employee: employeeId, used_at: nowIso() } as any;
    this.invites.set(inv.id, updated);
    return updated;
  }
  async updateEmployeeInvite(code: string, updates: Partial<InsertEmployeeInvite>): Promise<EmployeeInvite | undefined> {
    const inv = await this.getEmployeeInviteByCode(code);
    if (!inv) return undefined;
    const updated = { ...inv, ...updates } as any;
    this.invites.set(inv.id, updated);
    return updated;
  }

  // Shifts
  async createShift(shift: InsertShift): Promise<Shift> {
    const id = genId('shift');
    const row: Shift = { id, ...shift, created_at: nowIso() } as any;
    this.shifts.set(id, row);
    return row;
  }
  async getShift(id: string): Promise<Shift | undefined> { return this.shifts.get(id); }
  async getShiftsByEmployee(employeeId: string, limit = 10): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(s => s.employee_id === employeeId).slice(0, limit);
  }
  async getShiftsByEmployeeAndDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(s => s.employee_id === employeeId && s.planned_start_at >= startDate && s.planned_start_at <= endDate);
  }
  async getActiveShiftsByCompany(companyId: string): Promise<(Shift & { employee: Employee })[]> {
    const employees = await this.getEmployeesByCompany(companyId);
    const empById = new Map(employees.map(e => [e.id, e] as const));
    return Array.from(this.shifts.values())
      .filter(s => empById.has(s.employee_id) && s.status === 'active')
      .map(s => ({ ...(s as any), employee: empById.get(s.employee_id)! }));
  }
  async getTodayShiftForEmployee(employeeId: string): Promise<Shift | undefined> {
    return Array.from(this.shifts.values()).find(s => s.employee_id === employeeId);
  }
  async updateShift(id: string, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const row = this.shifts.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as Shift;
    this.shifts.set(id, updated);
    return updated;
  }

  // Work intervals
  async createWorkInterval(interval: InsertWorkInterval): Promise<WorkInterval> {
    const id = genId('work');
    const row: WorkInterval = { id, ...interval } as any;
    this.workIntervals.set(id, row);
    return row;
  }
  async getWorkIntervalsByShift(shiftId: string): Promise<WorkInterval[]> {
    return Array.from(this.workIntervals.values()).filter(w => w.shift_id === shiftId);
  }
  async updateWorkInterval(id: string, updates: Partial<InsertWorkInterval>): Promise<WorkInterval | undefined> {
    const row = this.workIntervals.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as any;
    this.workIntervals.set(id, updated);
    return updated;
  }

  // Break intervals
  async createBreakInterval(interval: InsertBreakInterval): Promise<BreakInterval> {
    const id = genId('break');
    const row: BreakInterval = { id, ...interval } as any;
    this.breakIntervals.set(id, row);
    return row;
  }
  async getBreakIntervalsByShift(shiftId: string): Promise<BreakInterval[]> {
    return Array.from(this.breakIntervals.values()).filter(w => w.shift_id === shiftId);
  }
  async updateBreakInterval(id: string, updates: Partial<InsertBreakInterval>): Promise<BreakInterval | undefined> {
    const row = this.breakIntervals.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as any;
    this.breakIntervals.set(id, updated);
    return updated;
  }

  // Daily reports
  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const id = genId('report');
    const row: DailyReport = { id, ...report } as any;
    this.dailyReports.set(id, row);
    return row;
  }
  async getDailyReportByShift(shiftId: string): Promise<DailyReport | undefined> {
    return Array.from(this.dailyReports.values()).find(r => r.shift_id === shiftId);
  }
  async getDailyReportsByCompany(companyId: string, limit = 50): Promise<(DailyReport & { shift: Shift; employee: Employee })[]> {
    const employees = await this.getEmployeesByCompany(companyId);
    const empById = new Map(employees.map(e => [e.id, e] as const));
    const shifts = Array.from(this.shifts.values()).filter(s => empById.has(s.employee_id));
    return shifts.slice(0, limit).map(s => ({
      id: genId('reportV'), shift_id: s.id,
      planned_items: [], done_items: [], blockers: null, tasks_links: [], time_spent: null, attachments: [], submitted_at: nowIso(),
      shift: s, employee: empById.get(s.employee_id)!
    })) as any;
  }

  // Exceptions
  async createException(exception: InsertException): Promise<Exception> {
    const id = genId('exc');
    const row: Exception = { id, ...exception, resolved_at: null } as any;
    this.exceptions.set(id, row);
    return row;
  }
  async getExceptionsByCompany(companyId: string): Promise<(Exception & { employee: Employee })[]> {
    const employees = await this.getEmployeesByCompany(companyId);
    const empById = new Map(employees.map(e => [e.id, e] as const));
    return Array.from(this.exceptions.values()).filter(e => empById.has(e.employee_id)).map(e => ({ ...(e as any), employee: empById.get(e.employee_id)! }));
  }
  async resolveException(id: string): Promise<Exception | undefined> {
    const row = this.exceptions.get(id);
    if (!row) return undefined;
    const updated = { ...row, resolved_at: nowIso() } as any;
    this.exceptions.set(id, updated);
    return updated;
  }

  // Reminders
  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = genId('rem');
    const row: Reminder = { id, ...reminder, sent_at: null } as any;
    this.reminders.set(id, row);
    return row;
    }
  async getPendingReminders(beforeTime?: Date): Promise<(Reminder & { employee: Employee })[]> {
    const t = beforeTime || new Date();
    return Array.from(this.reminders.values())
      .filter(r => (!r.sent_at && r.planned_at <= t))
      .map(r => ({ ...(r as any), employee: this.employees.get(r.employee_id)! }));
  }
  async markReminderSent(id: string): Promise<Reminder | undefined> {
    const row = this.reminders.get(id);
    if (!row) return undefined;
    const updated = { ...row, sent_at: new Date() } as any;
    this.reminders.set(id, updated);
    return updated;
  }

  // Audit
  async logAudit(log: InsertAuditLog): Promise<AuditLog> {
    return { id: genId('audit'), ...log } as any;
  }

  // Templates
  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const id = genId('tmpl');
    const row: ScheduleTemplate = { id, ...template } as any;
    this.schedules.set(id, row);
    return row;
  }
  async getScheduleTemplatesByCompany(companyId: string): Promise<ScheduleTemplate[]> {
    return Array.from(this.schedules.values()).filter(s => s.company_id === companyId);
  }
  async getScheduleTemplate(id: string): Promise<ScheduleTemplate | undefined> { return this.schedules.get(id); }
  async updateScheduleTemplate(id: string, updates: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const row = this.schedules.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as any;
    this.schedules.set(id, updated);
    return updated;
  }
  async deleteScheduleTemplate(id: string): Promise<void> { this.schedules.delete(id); }

  // Employee schedules
  async assignScheduleToEmployee(employeeId: string, scheduleId: string, validFrom: Date, validTo?: Date): Promise<void> {
    this.employeeSchedules.push({ employee_id: employeeId, schedule_id: scheduleId, valid_from: validFrom.toISOString().split('T')[0], valid_to: validTo ? validTo.toISOString().split('T')[0] : null });
  }
  async getEmployeeSchedules(employeeId: string): Promise<any[]> {
    return this.employeeSchedules.filter(e => e.employee_id === employeeId).map(e => ({ ...e, schedule: this.schedules.get(e.schedule_id)! }));
  }
  async getActiveEmployeeSchedule(employeeId: string, date: Date): Promise<any | undefined> {
    const d = date.toISOString().split('T')[0];
    return this.employeeSchedules.find(e => e.employee_id === employeeId && e.valid_from <= d && (!e.valid_to || e.valid_to >= d));
  }

  // Violation rules
  async createViolationRule(rule: InsertCompanyViolationRules): Promise<CompanyViolationRules> {
    const id = genId('vrule');
    const row: CompanyViolationRules = { id, ...rule } as any;
    this.violationRules.set(id, row);
    return row;
  }
  async getViolationRulesByCompany(companyId: string): Promise<CompanyViolationRules[]> {
    return Array.from(this.violationRules.values()).filter(r => r.company_id === companyId);
  }
  async getViolationRule(id: string): Promise<CompanyViolationRules | undefined> { return this.violationRules.get(id); }
  async updateViolationRule(id: string, updates: Partial<InsertCompanyViolationRules>): Promise<CompanyViolationRules | undefined> {
    const row = this.violationRules.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates } as any;
    this.violationRules.set(id, updated);
    return updated;
  }
  async deleteViolationRule(id: string): Promise<void> { this.violationRules.delete(id); }

  // Violations
  async createViolation(violation: InsertViolations): Promise<Violations> {
    const id = genId('viol');
    const row: Violations = { id, ...violation, created_at: new Date() } as any;
    this.violations.set(id, row);
    return row;
  }
  async getViolationsByEmployee(employeeId: string, periodStart?: Date, periodEnd?: Date): Promise<Violations[]> {
    return Array.from(this.violations.values()).filter(v => {
      if (v.employee_id !== employeeId) return false;
      if (!v.created_at) return false;
      if (periodStart && v.created_at < periodStart) return false;
      if (periodEnd && v.created_at > periodEnd) return false;
      return true;
    });
  }
  async getViolationsByCompany(companyId: string, periodStart?: Date, periodEnd?: Date): Promise<Violations[]> {
    return Array.from(this.violations.values()).filter(v => {
      if (v.company_id !== companyId) return false;
      if (!v.created_at) return false;
      if (periodStart && v.created_at < periodStart) return false;
      if (periodEnd && v.created_at > periodEnd) return false;
      return true;
    });
  }

  // Ratings
  async createEmployeeRating(rating: InsertEmployeeRating): Promise<EmployeeRating> {
    const id = genId('rate');
    const row: EmployeeRating = { id, ...rating, updated_at: new Date() } as any;
    this.ratings.set(id, row);
    return row;
  }
  async getEmployeeRating(employeeId: string, periodStart: Date, periodEnd: Date): Promise<EmployeeRating | undefined> {
    return Array.from(this.ratings.values()).find(r => r.employee_id === employeeId && r.period_start === periodStart.toISOString().split('T')[0] && r.period_end === periodEnd.toISOString().split('T')[0]);
  }
  async updateEmployeeRating(id: string, updates: Partial<InsertEmployeeRating>): Promise<EmployeeRating | undefined> {
    const row = this.ratings.get(id);
    if (!row) return undefined;
    const updated = { ...row, ...updates, updated_at: new Date() } as any;
    this.ratings.set(id, updated);
    return updated;
  }
  async getEmployeeRatingsByCompany(companyId: string, periodStart?: Date, periodEnd?: Date): Promise<EmployeeRating[]> {
    const startStr = periodStart ? periodStart.toISOString().split('T')[0] : undefined;
    const endStr = periodEnd ? periodEnd.toISOString().split('T')[0] : undefined;
    return Array.from(this.ratings.values()).filter(r => {
      if (r.company_id !== companyId) return false;
      if (startStr && r.period_start < startStr) return false;
      if (endStr && r.period_end > endStr) return false;
      return true;
    });
  }
  async calculateEmployeeRating(employeeId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const violations = await this.getViolationsByEmployee(employeeId, periodStart, periodEnd);
    const totalPenalty = violations.reduce((sum, v) => sum + Number(v.penalty || 0), 0);
    return Math.max(0, 100 - totalPenalty);
  }
  async updateEmployeeRatingFromViolations(employeeId: string, periodStart: Date, periodEnd: Date): Promise<EmployeeRating> {
    const ratingValue = await this.calculateEmployeeRating(employeeId, periodStart, periodEnd);
    const employee = await this.getEmployee(employeeId);
    if (!employee) throw new Error('Employee not found');

    // Find existing rating
    const existing = Array.from(this.ratings.values()).find(r =>
      r.employee_id === employeeId &&
      r.period_start === periodStart.toISOString().split('T')[0] &&
      r.period_end === periodEnd.toISOString().split('T')[0]
    );

    const newStatus = ratingValue <= 30 ? 'terminated' : ratingValue <= 50 ? 'warning' : 'active';

    if (existing) {
      const updated = { ...existing, rating: String(ratingValue), status: newStatus, updated_at: new Date() } as any;
      this.ratings.set(existing.id, updated);
      return updated;
    }

    const id = genId('rate');
    const row: EmployeeRating = {
      id,
      employee_id: employeeId,
      company_id: employee.company_id,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      rating: String(ratingValue),
      status: newStatus,
      updated_at: new Date(),
    } as any;
    this.ratings.set(id, row);

    // Update employee status if critical
    if (ratingValue <= 30) {
      await this.updateEmployee(employeeId, { status: 'terminated' } as any);
    }

    return row;
  }
}


