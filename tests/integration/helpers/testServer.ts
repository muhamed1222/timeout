import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes.js';
import { setupTestDatabase, cleanupTestDatabase } from './testDatabase.js';

let testServer: Server | null = null;
let testApp: Express | null = null;

/**
 * Setup test Express server
 */
export async function setupTestServer(): Promise<Express> {
  if (testApp) {
    return testApp;
  }

  // Initialize test database
  await setupTestDatabase();

  // Create Express app
  const app = express();
  app.use(express.json());

  // Register routes
  registerRoutes(app);

  testApp = app;
  testServer = createServer(app);

  return app;
}

/**
 * Cleanup test server
 */
export async function cleanupTestServer() {
  if (testServer) {
    testServer.close();
    testServer = null;
  }
  testApp = null;
  
  await cleanupTestDatabase();
}

/**
 * Make authenticated request
 */
export function authenticatedRequest(
  app: Express,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  token: string
) {
  return request(app)
    [method](url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Get supertest request for app
 */
export function getRequest(app: Express) {
  return request(app);
}




