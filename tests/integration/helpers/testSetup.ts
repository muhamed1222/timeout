import { beforeAll, afterAll } from 'vitest';
import { setupTestServer, cleanupTestServer } from './testServer.js';
import type { Express } from 'express';

/**
 * Check if error should cause tests to be skipped
 */
export function shouldSkipTests(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  return (
    error.message.includes('DATABASE_URL') || 
    error.message.includes('timed out') ||
    error.message.includes('unavailable') ||
    error.message.includes('unreachable') ||
    error.message.includes('whitelisted') ||
    error.message.includes('allow_list')
  );
}

/**
 * Setup integration test suite with database connection handling
 * Automatically skips tests if DATABASE_URL is not configured or connection fails
 */
export function setupIntegrationTestSuite() {
  let app: Express | null = null;
  let skipTests = false;

  beforeAll(async () => {
    // Skip tests if DATABASE_URL is not configured
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '') {
      skipTests = true;
      return;
    }
    
    try {
      app = await setupTestServer();
    } catch (error) {
      // If setup fails due to database, skip all tests
      if (shouldSkipTests(error)) {
        skipTests = true;
        return;
      }
      throw error;
    }
  }, 30000); // 30 seconds timeout for DB connection

  afterAll(async () => {
    if (app) {
      await cleanupTestServer();
    }
  });

  return {
    getApp: () => {
      if (skipTests || !app) {
        return null;
      }
      return app;
    },
    shouldSkip: () => skipTests || !app,
  };
}

