/**
 * Employee validation schemas
 */

import { z } from "zod";
import { uuidSchema, dateStringSchema } from "./common.schemas.js";

/**
 * Create employee schema
 */
export const createEmployeeSchema = z.object({
  company_id: uuidSchema,
  full_name: z.string().min(1, "Full name is required").max(200),
  position: z.string().max(100).optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  telegram_user_id: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active").optional(),
  tz: z.string().optional(),
  avatar_id: z.number().int().min(1).max(8).nullable().optional(),
  photo_url: z.string().url().nullable().optional().or(z.literal("")),
});

/**
 * Update employee schema
 */
export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ company_id: true });

/**
 * Employee ID param schema
 */
export const employeeIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Telegram user ID param schema
 */
export const telegramUserIdParamSchema = z.object({
  telegramUserId: z.string().min(1),
});

/**
 * Employee ID in route params (different key name)
 */
export const employeeIdInParamsSchema = z.object({
  employeeId: uuidSchema,
});

