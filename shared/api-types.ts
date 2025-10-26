/**
 * Shared API types for frontend-backend communication
 * Ensures type safety across the full stack
 */

import type {
  Company,
  Employee,
  Shift,
  WorkInterval,
  BreakInterval,
  DailyReport,
  Exception,
  EmployeeInvite,
  ScheduleTemplate,
  CompanyViolationRules,
  Violations,
  EmployeeRating
} from "./schema";

// ===== Auth API =====
export interface RegisterRequest {
  email: string;
  password: string;
  company_name: string;
  full_name: string;
}

export interface RegisterResponse {
  success: boolean;
  company_id: string;
}

// ===== Company API =====
export interface CompanyStatsResponse {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
}

export interface GenerateShiftsRequest {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
}

export interface GenerateShiftsResponse {
  message: string;
  shifts: Shift[];
}

// ===== Employee API =====
export type EmployeeResponse = Employee;
export type EmployeeListResponse = Employee[];

// ===== Invite API =====
export interface InviteLinkResponse {
  code: string;
  deep_link: string;
  qr_code_url: string;
}

export type EmployeeInviteResponse = EmployeeInvite;
export type EmployeeInviteListResponse = EmployeeInvite[];

// ===== Shift API =====
export interface ShiftWithEmployee extends Shift {
  employee: {
    full_name: string;
    position: string;
  };
}

export type ShiftResponse = Shift;
export type ShiftListResponse = Shift[];
export type ActiveShiftsResponse = ShiftWithEmployee[];

// ===== Rating API =====
export interface RatingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export type RatingPeriodsResponse = RatingPeriod[];

export interface ViolationRuleResponse extends CompanyViolationRules {}
export type ViolationRulesListResponse = CompanyViolationRules[];

export interface CreateViolationRequest {
  employee_id: string;
  company_id: string;
  rule_id: string;
  source: 'manual' | 'auto';
  reason?: string;
  created_by?: string;
}

export type ViolationResponse = Violations;
export type ViolationListResponse = Violations[];

export interface EmployeeRatingWithDetails extends EmployeeRating {
  employee?: {
    full_name: string;
    position?: string;
  };
}

export type RatingResponse = EmployeeRating;
export type RatingListResponse = EmployeeRatingWithDetails[];

export interface RecalculateRatingRequest {
  periodStart?: string;
  periodEnd?: string;
}

export interface RecalculateRatingResponse {
  message: string;
  count?: number;
  processed?: number;
  periodStart?: string;
  periodEnd?: string;
}

// ===== Schedule API =====
export type ScheduleTemplateResponse = ScheduleTemplate;
export type ScheduleTemplateListResponse = ScheduleTemplate[];

export interface AssignScheduleRequest {
  employee_id: string;
  schedule_id: string;
  valid_from: string;
  valid_to?: string;
}

// ===== Work Intervals API =====
export type WorkIntervalResponse = WorkInterval;
export type WorkIntervalListResponse = WorkInterval[];

// ===== Break Intervals API =====
export type BreakIntervalResponse = BreakInterval;
export type BreakIntervalListResponse = BreakInterval[];

// ===== Daily Report API =====
export type DailyReportResponse = DailyReport;
export interface DailyReportWithDetails extends DailyReport {
  shift?: Shift;
  employee?: Employee;
}
export type DailyReportListResponse = DailyReportWithDetails[];

// ===== Exception API =====
export interface ExceptionWithEmployee extends Exception {
  employee: Employee;
}
export type ExceptionResponse = Exception;
export type ExceptionListResponse = ExceptionWithEmployee[];

// ===== Telegram WebApp API =====
export interface TelegramEmployeeStatus {
  employee: {
    id: string;
    full_name: string;
    telegram_user_id: string | null;
  };
  activeShift?: Shift;
  workIntervals: WorkInterval[];
  breakIntervals: BreakInterval[];
  status: 'off_work' | 'working' | 'on_break' | 'unknown';
}

// ===== Error Response =====
export interface ErrorResponse {
  error: string;
  details?: any;
}

export interface ValidationErrorResponse {
  error: string;
  details: Array<{
    code: string;
    message: string;
    path: string[];
  }>;
}

// ===== Success Response =====
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

