/**
 * Employee invite validation schemas
 */

import { z } from "zod";
import { uuidSchema, dateStringSchema } from "./common.schemas.js";

/**
 * Create invite schema
 */
export const createInviteSchema = z.object({
  company_id: uuidSchema,
  full_name: z.string().max(200).optional(),
  position: z.string().max(100).optional(),
  expires_at: dateStringSchema.optional(),
});

/**
 * Invite code param schema
 */
export const inviteCodeParamSchema = z.object({
  code: z.string().min(1),
});

/**
 * Use invite schema
 */
export const useInviteSchema = z.object({
  employee_id: uuidSchema.optional(),
});

/**
 * Accept invite schema (for Telegram bot)
 */
export const acceptInviteSchema = z.object({
  telegram_user_id: z.string().min(1),
  telegram_username: z.string().optional(),
});

/**
 * Invite ID param schema
 */
export const inviteIdParamSchema = z.object({
  id: uuidSchema,
});




