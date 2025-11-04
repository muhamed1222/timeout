/**
 * Shift validation schemas
 */

import { z } from "zod";
import { uuidSchema, dateStringSchema } from "./common.schemas.js";

/**
 * Shift status enum
 */
export const shiftStatusSchema = z.enum(["scheduled", "active", "paused", "completed", "cancelled"]);

/**
 * Create shift schema
 */
export const createShiftSchema = z.object({
  employee_id: uuidSchema,
  company_id: uuidSchema.optional(),
  planned_start_at: dateStringSchema,
  planned_end_at: dateStringSchema,
  status: shiftStatusSchema.default("scheduled").optional(),
  source: z.enum(["manual", "telegram", "api"]).default("manual").optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => new Date(data.planned_end_at) > new Date(data.planned_start_at),
  { message: "End time must be after start time", path: ["planned_end_at"] },
);

/**
 * Update shift schema
 */
export const updateShiftSchema = z.object({
  planned_start_at: dateStringSchema.optional(),
  planned_end_at: dateStringSchema.optional(),
  actual_start_at: dateStringSchema.optional(),
  actual_end_at: dateStringSchema.optional(),
  status: shiftStatusSchema.optional(),
  source: z.enum(["manual", "telegram", "api"]).optional(),
  end_at: dateStringSchema.optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Work interval schema
 */
export const createWorkIntervalSchema = z.object({
  shift_id: uuidSchema,
  start_at: dateStringSchema,
  end_at: dateStringSchema.optional(),
});

/**
 * Update work interval schema
 */
export const updateWorkIntervalSchema = z.object({
  start_at: dateStringSchema.optional(),
  end_at: dateStringSchema.optional(),
});

/**
 * Break interval schema
 */
export const createBreakIntervalSchema = z.object({
  shift_id: uuidSchema,
  start_at: dateStringSchema,
  end_at: dateStringSchema.optional(),
  type: z.enum(["lunch", "break", "other"]).default("break").optional(),
});

/**
 * Update break interval schema
 */
export const updateBreakIntervalSchema = z.object({
  start_at: dateStringSchema.optional(),
  end_at: dateStringSchema.optional(),
  type: z.enum(["lunch", "break", "other"]).optional(),
});

/**
 * Daily report schema
 */
export const createDailyReportSchema = z.object({
  shift_id: uuidSchema,
  done_items: z.string().min(1).max(5000),
  details: z.record(z.any()).optional(),
});

/**
 * Shift ID param schema
 */
export const shiftIdParamSchema = z.object({
  id: uuidSchema,
});



