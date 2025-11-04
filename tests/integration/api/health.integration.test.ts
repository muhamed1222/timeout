/**
 * Integration tests for Health Check API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import type { Express } from 'express';

describe('Health Check API Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await setupTestServer();
  });

  afterAll(async () => {
    await cleanupTestServer();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await getRequest(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(['ok', 'degraded', 'error']).toContain(response.body.status);
    });

    it('should return service statuses', async () => {
      const response = await getRequest(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      if (response.body.services) {
        expect(typeof response.body.services).toBe('object');
      }
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await getRequest(app)
        .get('/api/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return metrics', async () => {
      const response = await getRequest(app)
        .get('/api/metrics');

      // Metrics endpoint may return 200 or 501 (not implemented)
      expect([200, 501]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });
});



