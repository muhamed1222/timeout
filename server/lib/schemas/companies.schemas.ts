/**
 * Company validation schemas
 */

import { z } from 'zod';
import { uuidSchema } from './common.schemas.js';

/**
 * Create company schema
 */
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  timezone: z.string().default('Europe/Amsterdam'),
  locale: z.string().default('ru'),
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

