/**
 * Violation validation schemas
 */

import { z } from "zod";
import { uuidSchema } from "./common.schemas.js";

/**
 * Create violation schema
 */
export const createViolationSchema = z.object({
  employee_id: uuidSchema,
  company_id: uuidSchema,
  rule_id: uuidSchema,
  source: z.enum(["manual", "auto"]).default("manual"),
  reason: z.string().max(1000).optional(),
  created_by: uuidSchema.optional(),
});

/**
 * Violation rule create schema
 */
export const createViolationRuleSchema = z.object({
  company_id: uuidSchema,
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  penalty_percent: z.union([z.string().regex(/^\d+$/), z.number()]).transform((v) =>
    typeof v === "number" ? v.toString() : v,
  ),
  auto_detectable: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

/**
 * Violation rule update schema
 */
export const updateViolationRuleSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  penalty_percent: z.union([z.string().regex(/^\d+$/), z.number()]).transform((v) =>
    typeof v === "number" ? v.toString() : v,
  ).optional(),
  auto_detectable: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Violation rule ID param schema
 */
export const violationRuleIdParamSchema = z.object({
  id: uuidSchema,
});



