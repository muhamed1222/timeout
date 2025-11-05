/**
 * Integration tests for Violation Rules API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Violation Rules API Integration', () => {
  let app: Express;
  let authToken: string;
  let companyId: string;
  let ruleId: string;

  beforeAll(async () => {
    app = await setupTestServer();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { token, company } = await createTestCompany();
    authToken = token;
    companyId = company.id;
  });

  afterAll(async () => {
    await cleanupTestServer();
  });

  describe('POST /api/violation-rules', () => {
    it('should create a violation rule', async () => {
      const response = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          code: 'LATE_START',
          name: 'Late Start',
          description: 'Employee arrived late to shift',
          penalty_percent: 5,
          auto_detectable: true,
          is_active: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('LATE_START');
      expect(response.body.penalty_percent).toBe('5');
      ruleId = response.body.id;
    });

    it('should return 400 with invalid data', async () => {
      const response = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await getRequest(app)
        .post('/api/violation-rules')
        .send({
          company_id: companyId,
          code: 'TEST',
          name: 'Test',
          penalty_percent: 5,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/violation-rules', () => {
    it('should return violation rules for company', async () => {
      // Create a rule first
      await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          code: 'EARLY_END',
          name: 'Early End',
          description: 'Employee ended shift early',
          penalty_percent: 3,
          auto_detectable: false,
          is_active: true,
        });

      const response = await getRequest(app)
        .get(`/api/violation-rules?company_id=${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('code');
    });
  });

  describe('GET /api/violation-rules/:id', () => {
    it('should return violation rule by ID', async () => {
      // Create a rule first
      const createResponse = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          code: 'MISSED_SHIFT',
          name: 'Missed Shift',
          description: 'Employee did not show up',
          penalty_percent: 10,
          auto_detectable: true,
          is_active: true,
        });

      const ruleId = createResponse.body.id;

      const response = await getRequest(app)
        .get(`/api/violation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(ruleId);
      expect(response.body.code).toBe('MISSED_SHIFT');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await getRequest(app)
        .get('/api/violation-rules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/violation-rules/:id', () => {
    it('should update violation rule', async () => {
      // Create a rule first
      const createResponse = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          code: 'UPDATE_TEST',
          name: 'Original Name',
          description: 'Original description',
          penalty_percent: 5,
          is_active: true,
        });

      const ruleId = createResponse.body.id;

      const response = await getRequest(app)
        .put(`/api/violation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          penalty_percent: 7,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.penalty_percent).toBe('7');
    });
  });

  describe('DELETE /api/violation-rules/:id', () => {
    it('should delete violation rule', async () => {
      // Create a rule first
      const createResponse = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          code: 'DELETE_TEST',
          name: 'To Delete',
          description: 'This will be deleted',
          penalty_percent: 5,
          is_active: true,
        });

      const ruleId = createResponse.body.id;

      const response = await getRequest(app)
        .delete(`/api/violation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify it's deleted
      const getResponse = await getRequest(app)
        .get(`/api/violation-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});




