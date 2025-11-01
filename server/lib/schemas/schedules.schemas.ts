/**
 * Schedule validation schemas
 */

import { z } from 'zod';
import { uuidSchema } from './common.schemas.js';

/**
 * Create schedule template schema
 */
export const createScheduleTemplateSchema = z.object({
  company_id: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  work_days: z.array(z.number().int().min(0).max(6)), // 0 = Sunday, 6 = Saturday
  start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  end_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  break_duration_minutes: z.number().int().min(0).max(240).default(60).optional(),
  is_active: z.boolean().default(true).optional(),
});

/**
 * Update schedule template schema
 */
export const updateScheduleTemplateSchema = createScheduleTemplateSchema.partial().omit({ company_id: true });

/**
 * Assign schedule to employee schema
 */
export const assignScheduleSchema = z.object({
  employee_id: uuidSchema,
  schedule_template_id: uuidSchema,
  start_date: z.string().datetime().or(z.date()),
  end_date: z.string().datetime().or(z.date()).optional(),
});

/**
 * Schedule ID param schema
 */
export const scheduleIdParamSchema = z.object({
  id: uuidSchema,
});

