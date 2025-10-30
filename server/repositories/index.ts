import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema.js';
import { CompanyRepository } from './CompanyRepository.js';
import { EmployeeRepository } from './EmployeeRepository.js';
import { ShiftRepository } from './ShiftRepository.js';
import { RatingRepository } from './RatingRepository.js';
import { ScheduleRepository } from './ScheduleRepository.js';

// Initialize database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false 
});

const db = drizzle(client, { schema });

/**
 * Centralized repositories for database access
 * 
 * @example
 * import { repositories } from './repositories';
 * 
 * const company = await repositories.company.findById('123');
 * const employees = await repositories.employee.findByCompanyId('123');
 */
export const repositories = {
  company: new CompanyRepository(db),
  employee: new EmployeeRepository(db),
  shift: new ShiftRepository(db),
  rating: new RatingRepository(db),
  schedule: new ScheduleRepository(db),
} as const;

// Export individual repositories for direct import
export { CompanyRepository } from './CompanyRepository.js';
export { EmployeeRepository } from './EmployeeRepository.js';
export { ShiftRepository } from './ShiftRepository.js';
export { RatingRepository } from './RatingRepository.js';
export { ScheduleRepository } from './ScheduleRepository.js';
export { BaseRepository } from './BaseRepository.js';

// Export db for custom queries  
export { db };

