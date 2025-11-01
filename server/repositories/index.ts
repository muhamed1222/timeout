import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema.js';
import { CompanyRepository } from './CompanyRepository.js';
import { EmployeeRepository } from './EmployeeRepository.js';
import { RatingRepository } from './RatingRepository.js';
import { ViolationRepository } from './ViolationRepository.js';
import { ShiftRepository } from './ShiftRepository.js';
import { ExceptionRepository } from './ExceptionRepository.js';
import { ScheduleRepository } from './ScheduleRepository.js';
import { InviteRepository } from './InviteRepository.js';
import { ReminderRepository } from './ReminderRepository.js';
import { AuditRepository } from './AuditRepository.js';
import { createContainer } from '../lib/di/container.js';

// Initialize database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false 
});

const db = drizzle(client, { schema });

/**
 * Centralized repositories for database access
 * 
 * @deprecated Direct import of repositories singleton.
 * For new code, use dependency injection via services or getContainer().
 * This export is maintained for backward compatibility.
 * 
 * @example
 * import { repositories } from './repositories.js';
 * 
 * const company = await repositories.company.findById('123');
 * const employees = await repositories.employee.findByCompanyId('123');
 */
export const repositories = {
  company: new CompanyRepository(db),
  employee: new EmployeeRepository(db),
  rating: new RatingRepository(db),
  violation: new ViolationRepository(db),
  shift: new ShiftRepository(db),
  exception: new ExceptionRepository(db),
  schedule: new ScheduleRepository(db),
  invite: new InviteRepository(db),
  reminder: new ReminderRepository(db),
  audit: new AuditRepository(db),
} as const;

// Initialize DI container with repositories
createContainer({ repositories });

// Export individual repositories for direct import
export { CompanyRepository } from './CompanyRepository.js';
export { EmployeeRepository } from './EmployeeRepository.js';
export { RatingRepository } from './RatingRepository.js';
export { ViolationRepository } from './ViolationRepository.js';
export { ShiftRepository } from './ShiftRepository.js';
export { ExceptionRepository } from './ExceptionRepository.js';
export { ScheduleRepository } from './ScheduleRepository.js';
export { InviteRepository } from './InviteRepository.js';
export { ReminderRepository } from './ReminderRepository.js';
export { AuditRepository } from './AuditRepository.js';
export { BaseRepository } from './BaseRepository.js';

// Export db for custom queries  
export { db };

