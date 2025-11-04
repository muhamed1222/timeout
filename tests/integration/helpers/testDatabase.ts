import { db } from '../../../server/repositories/index.js';
import { sql } from 'drizzle-orm';

/**
 * Clean all tables in the test database
 */
export async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await db.execute(sql`TRUNCATE TABLE daily_report CASCADE`);
  await db.execute(sql`TRUNCATE TABLE exception CASCADE`);
  await db.execute(sql`TRUNCATE TABLE violations CASCADE`);
  await db.execute(sql`TRUNCATE TABLE break_interval CASCADE`);
  await db.execute(sql`TRUNCATE TABLE work_interval CASCADE`);
  await db.execute(sql`TRUNCATE TABLE shift CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employee_rating CASCADE`);
  await db.execute(sql`TRUNCATE TABLE company_violation_rules CASCADE`);
  await db.execute(sql`TRUNCATE TABLE reminder CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employee_schedule CASCADE`);
  await db.execute(sql`TRUNCATE TABLE schedule_template CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employee_invite CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employee CASCADE`);
  await db.execute(sql`TRUNCATE TABLE company CASCADE`);
  await db.execute(sql`TRUNCATE TABLE audit_log CASCADE`);
}

/**
 * Reset sequences after cleaning
 */
export async function resetSequences() {
  // PostgreSQL auto-increment sequences don't need manual reset with TRUNCATE CASCADE
  // But we can reset them explicitly if needed
}

/**
 * Setup test database for integration tests
 */
export async function setupTestDatabase() {
  await cleanDatabase();
  await resetSequences();
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase() {
  await cleanDatabase();
}







