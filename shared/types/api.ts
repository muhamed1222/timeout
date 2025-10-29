/**
 * Shared API types for type-safe request/response handling
 */

import type { ShiftStatus } from '../schema';

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    company_id: string;
  };
  token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export interface EmployeeResponse {
  id: string;
  company_id: string;
  full_name: string;
  position: string;
  email: string | null;
  phone_number: string | null;
  telegram_user_id: string | null;
  telegram_username: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  full_name: string;
  position: string;
  email?: string;
  phone_number?: string;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  telegram_user_id?: string;
  telegram_username?: string;
}

// ============================================================================
// SHIFT TYPES
// ============================================================================

export interface ShiftResponse {
  id: string;
  employee_id: string;
  company_id: string;
  status: ShiftStatus;
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Partial<EmployeeResponse>;
}

export interface CreateShiftRequest {
  employee_id: string;
  planned_start_at: string;
  planned_end_at: string;
  notes?: string;
}

export interface UpdateShiftRequest {
  planned_start_at?: string;
  planned_end_at?: string;
  actual_start_at?: string;
  actual_end_at?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface StartShiftRequest {
  actual_start_at?: string;
  notes?: string;
}

export interface EndShiftRequest {
  actual_end_at?: string;
  notes?: string;
}

// ============================================================================
// BREAK TYPES
// ============================================================================

export interface BreakIntervalResponse {
  id: string;
  shift_id: string;
  start_at: string;
  end_at: string | null;
  reason: string | null;
  created_at: string;
}

export interface StartBreakRequest {
  start_at?: string;
  reason?: string;
}

export interface EndBreakRequest {
  end_at?: string;
}

// ============================================================================
// VIOLATION TYPES
// ============================================================================

export interface ViolationResponse {
  id: string;
  employee_id: string;
  company_id: string;
  shift_id: string | null;
  rule_id: string | null;
  type: 'late_start' | 'early_end' | 'long_break' | 'missed_shift' | 'unauthorized_absence' | 'other';
  severity: number;
  description: string;
  detected_at: string;
  source: 'auto' | 'manual';
  evidence: Record<string, unknown> | null;
  created_at: string;
  employee?: Partial<EmployeeResponse>;
}

export interface CreateViolationRequest {
  employee_id: string;
  shift_id?: string;
  rule_id?: string;
  type: ViolationResponse['type'];
  severity: number;
  description: string;
  detected_at?: string;
  source?: 'auto' | 'manual';
  evidence?: Record<string, unknown>;
}

// ============================================================================
// EXCEPTION TYPES
// ============================================================================

export interface ExceptionResponse {
  id: string;
  employee_id: string;
  company_id: string;
  violation_id: string | null;
  kind: 'sick_leave' | 'vacation' | 'personal' | 'technical_issue' | 'approved_late' | 'other';
  description: string;
  date: string;
  approved_by: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
  employee?: Partial<EmployeeResponse>;
}

export interface CreateExceptionRequest {
  employee_id: string;
  violation_id?: string;
  kind: ExceptionResponse['kind'];
  description: string;
  date: string;
  approved_by?: string;
}

export interface ResolveExceptionRequest {
  resolution: string;
  approved: boolean;
  resolved_by: string;
}

// ============================================================================
// RATING TYPES
// ============================================================================

export interface EmployeeRatingResponse {
  id: string;
  employee_id: string;
  company_id: string;
  rating: number;
  period_start: string;
  period_end: string;
  total_violations: number;
  total_exceptions_approved: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStatsResponse {
  totalEmployees: number;
  activeEmployees: number;
  activeShifts: number;
  todayShifts: number;
  pendingExceptions: number;
  avgRating: number;
  totalViolations: number;
}

// ============================================================================
// TELEGRAM WEBHOOK TYPES
// ============================================================================

export interface TelegramLinkRequest {
  telegram_id: string;
  telegram_username?: string;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    data: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  statusCode?: number;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  companyId?: string;
  employeeId?: string;
}

export interface ShiftUpdateMessage {
  shift: ShiftResponse;
  action: 'started' | 'ended' | 'paused' | 'cancelled' | 'updated';
}

export interface ViolationUpdateMessage {
  violation: ViolationResponse;
  action: 'created' | 'detected';
}

export interface DashboardUpdateMessage {
  stats: DashboardStatsResponse;
}

