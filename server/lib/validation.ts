/**
 * Centralized validation schemas using Zod
 * All API request validation should use these schemas
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const dateSchema = z.union([
  z.string().datetime(),
  z.date(),
  z.string().transform((str) => new Date(str))
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
});

// ============================================================================
// COMPANY SCHEMAS
// ============================================================================

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.string().optional(),
  timezone: z.string().default('UTC'),
  settings: z.object({
    working_hours_start: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
    working_hours_end: z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
    break_duration_minutes: z.number().int().min(0).max(120).default(60),
  }).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ============================================================================
// EMPLOYEE SCHEMAS
// ============================================================================

export const createEmployeeSchema = z.object({
  full_name: z.string().min(2).max(100),
  position: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  hire_date: dateSchema.optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const linkTelegramSchema = z.object({
  telegram_id: z.string().regex(/^\d+$/, 'Invalid Telegram ID'),
  telegram_username: z.string().min(1).optional(),
});

// ============================================================================
// SHIFT SCHEMAS
// ============================================================================

export const shiftStatusSchema = z.enum(['scheduled', 'active', 'paused', 'completed', 'cancelled']);

export const createShiftSchema = z.object({
  employee_id: uuidSchema,
  planned_start_at: dateSchema,
  planned_end_at: dateSchema,
  notes: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.planned_end_at) > new Date(data.planned_start_at),
  { message: 'End time must be after start time', path: ['planned_end_at'] }
);

export const updateShiftSchema = z.object({
  planned_start_at: dateSchema.optional(),
  planned_end_at: dateSchema.optional(),
  actual_start_at: dateSchema.optional(),
  actual_end_at: dateSchema.optional(),
  status: shiftStatusSchema.optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.planned_start_at && data.planned_end_at) {
      return new Date(data.planned_end_at) > new Date(data.planned_start_at);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['planned_end_at'] }
);

export const startShiftSchema = z.object({
  actual_start_at: dateSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const endShiftSchema = z.object({
  actual_end_at: dateSchema.optional(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// BREAK SCHEMAS
// ============================================================================

export const startBreakSchema = z.object({
  start_at: dateSchema.optional(),
  reason: z.string().max(200).optional(),
});

export const endBreakSchema = z.object({
  end_at: dateSchema.optional(),
});

// ============================================================================
// VIOLATION SCHEMAS
// ============================================================================

export const violationTypeSchema = z.enum([
  'late_start',
  'early_end',
  'long_break',
  'missed_shift',
  'unauthorized_absence',
  'other'
]);

export const violationSourceSchema = z.enum(['auto', 'manual']);

export const createViolationSchema = z.object({
  employee_id: uuidSchema,
  shift_id: uuidSchema.optional(),
  rule_id: uuidSchema.optional(),
  type: violationTypeSchema,
  severity: z.number().int().min(1).max(10),
  description: z.string().min(10).max(500),
  detected_at: dateSchema.optional(),
  source: violationSourceSchema.default('manual'),
  evidence: z.record(z.any()).optional(),
});

// ============================================================================
// EXCEPTION SCHEMAS
// ============================================================================

export const exceptionKindSchema = z.enum([
  'sick_leave',
  'vacation',
  'personal',
  'technical_issue',
  'approved_late',
  'other'
]);

export const createExceptionSchema = z.object({
  employee_id: uuidSchema,
  violation_id: uuidSchema.optional(),
  kind: exceptionKindSchema,
  description: z.string().min(10).max(500),
  date: dateSchema,
  approved_by: uuidSchema.optional(),
});

export const resolveExceptionSchema = z.object({
  resolution: z.string().min(10).max(500),
  approved: z.boolean(),
  resolved_by: uuidSchema,
});

// ============================================================================
// EMPLOYEE INVITE SCHEMAS
// ============================================================================

export const createInviteSchema = z.object({
  employee_id: uuidSchema,
  expires_at: dateSchema.optional(),
});

// ============================================================================
// DAILY REPORT SCHEMAS
// ============================================================================

export const createDailyReportSchema = z.object({
  shift_id: uuidSchema,
  employee_id: uuidSchema,
  tasks_completed: z.string().min(10).max(1000),
  issues_encountered: z.string().max(1000).optional(),
  notes: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

// ============================================================================
// REMINDER SCHEMAS
// ============================================================================

export const createReminderSchema = z.object({
  employee_id: uuidSchema,
  message: z.string().min(1).max(500),
  planned_at: dateSchema,
  type: z.enum(['shift_start', 'break_end', 'shift_end', 'custom']).default('custom'),
});

// ============================================================================
// VIOLATION RULES SCHEMAS
// ============================================================================

export const createViolationRuleSchema = z.object({
  company_id: uuidSchema,
  code: z.string().min(2).max(50).regex(/^[A-Z_]+$/),
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  severity: z.number().int().min(1).max(10),
  auto_detectable: z.boolean().default(false),
  conditions: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
});

export const updateViolationRuleSchema = createViolationRuleSchema.partial().omit({ company_id: true });

// ============================================================================
// QUERY PARAMS SCHEMAS
// ============================================================================

export const employeeQuerySchema = z.object({
  company_id: uuidSchema.optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
});

export const shiftQuerySchema = z.object({
  employee_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  status: shiftStatusSchema.optional(),
  from_date: dateSchema.optional(),
  to_date: dateSchema.optional(),
  ...paginationSchema.shape,
});

export const violationQuerySchema = z.object({
  employee_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  type: violationTypeSchema.optional(),
  severity_min: z.coerce.number().int().min(1).max(10).optional(),
  severity_max: z.coerce.number().int().min(1).max(10).optional(),
  from_date: dateSchema.optional(),
  to_date: dateSchema.optional(),
  ...paginationSchema.shape,
});

export const exceptionQuerySchema = z.object({
  employee_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  kind: exceptionKindSchema.optional(),
  resolved: z.coerce.boolean().optional(),
  from_date: dateSchema.optional(),
  to_date: dateSchema.optional(),
  ...paginationSchema.shape,
});

// ============================================================================
// HELPER TYPES (extracted from schemas)
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type CreateViolationInput = z.infer<typeof createViolationSchema>;
export type CreateExceptionInput = z.infer<typeof createExceptionSchema>;
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;
export type ShiftQuery = z.infer<typeof shiftQuerySchema>;
export type ViolationQuery = z.infer<typeof violationQuerySchema>;
export type ExceptionQuery = z.infer<typeof exceptionQuerySchema>;





