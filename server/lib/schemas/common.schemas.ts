/**
 * Common validation schemas
 */

import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * UUID param schema (for route params)
 */
export const uuidParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Date schema - accepts ISO string or Date object
 */
export const dateSchema = z.union([
  z.string().datetime(),
  z.date(),
  z.string().transform((str) => new Date(str))
]).transform((val) => val instanceof Date ? val : new Date(val));

/**
 * Date string schema (for JSON clients)
 */
export const dateStringSchema = z.coerce.date();

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

