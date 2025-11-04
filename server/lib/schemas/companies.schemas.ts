/**
 * Company validation schemas
 */

import { z } from "zod";
import { uuidSchema } from "./common.schemas.js";

/**
 * Create company schema
 */
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  timezone: z.string().default("Europe/Amsterdam"),
  locale: z.string().default("ru"),
  privacy_settings: z.record(z.any()).optional(),
});

/**
 * Update company schema
 */
export const updateCompanySchema = createCompanySchema.partial();

/**
 * Company ID param schema
 */
export const companyIdParamSchema = z.object({
  id: uuidSchema,
});

// Schema for companyId in route params (different key name)
export const companyIdInParamsSchema = z.object({
  companyId: uuidSchema,
});

/**
 * Generate shifts request schema
 */
export const generateShiftsSchema = z.object({
  startDate: z.string().datetime().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)),
  endDate: z.string().datetime().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)),
  employeeIds: z.array(uuidSchema).optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: "End date must be after or equal to start date", path: ["endDate"] },
);

/**
 * Exception ID param schema
 */
export const exceptionIdParamSchema = z.object({
  exceptionId: uuidSchema,
  companyId: uuidSchema,
});

