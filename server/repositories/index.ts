import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema.js';
import { CompanyRepository } from './CompanyRepository.js';
import { EmployeeRepository } from './EmployeeRepository.js';
import { RatingRepository } from './RatingRepository.js';

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
 * import { repositories } from './repositories.js';
 * 
 * const company = await repositories.company.findById('123');
 * const employees = await repositories.employee.findByCompanyId('123');
 */
export const repositories = {
  company: new CompanyRepository(db),
  employee: new EmployeeRepository(db),
  rating: new RatingRepository(db),
} as const;

// Export individual repositories for direct import
export { CompanyRepository } from './CompanyRepository.js';
export { EmployeeRepository } from './EmployeeRepository.js';
export { RatingRepository } from './RatingRepository.js';
export { BaseRepository } from './BaseRepository.js';

// Export db for custom queries  
export { db };

