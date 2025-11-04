import { db } from '../../../server/storage.js';
import { sql } from 'drizzle-orm';

/**
 * Clean all tables in the test database
 */
export async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await db.execute(sql`TRUNCATE TABLE report CASCADE`);
  await db.execute(sql`TRUNCATE TABLE exception CASCADE`);
  await db.execute(sql`TRUNCATE TABLE violation CASCADE`);
  await db.execute(sql`TRUNCATE TABLE break CASCADE`);
  await db.execute(sql`TRUNCATE TABLE shift CASCADE`);
  await db.execute(sql`TRUNCATE TABLE rating_period CASCADE`);
  await db.execute(sql`TRUNCATE TABLE violation_rule CASCADE`);
  await db.execute(sql`TRUNCATE TABLE employee CASCADE`);
  await db.execute(sql`TRUNCATE TABLE company CASCADE`);
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







