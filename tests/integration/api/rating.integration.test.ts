import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee, createTestRatingPeriod, createTestViolationRule } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Rating API Integration', () => {
  let app: Express;
  let authToken: string;
  let companyId: string;
  let employeeId: string;

  beforeAll(async () => {
    app = await setupTestServer();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { token, company } = await createTestCompany();
    authToken = token;
    companyId = company.id;
    const employee = await createTestEmployee(companyId);
    employeeId = employee.id;
  });

  afterAll(async () => {
    await cleanupTestServer();
  });

  describe('GET /api/companies/:companyId/rating-periods', () => {
    it('should return all rating periods', async () => {
      await createTestRatingPeriod(companyId, { name: 'Q1 2024' });
      await createTestRatingPeriod(companyId, { name: 'Q2 2024' });

      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/rating-periods`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/rating-periods', () => {
    it('should create rating period', async () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const newPeriod = {
        company_id: companyId,
        name: 'Test Period',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      };

      const response = await getRequest(app)
        .post('/api/rating-periods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPeriod);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: newPeriod.name,
        company_id: companyId,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 with overlapping dates', async () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      await createTestRatingPeriod(companyId, {
        start_date: now,
        end_date: endDate,
      });

      const response = await getRequest(app)
        .post('/api/rating-periods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          name: 'Overlapping Period',
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
        });

      // Should prevent overlapping periods
      expect([400, 409]).toContain(response.status);
    });
  });

  describe('GET /api/employees/:employeeId/rating', () => {
    it('should return employee rating', async () => {
      const response = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rating');
      expect(typeof response.body.rating).toBe('number');
      expect(response.body.rating).toBeGreaterThanOrEqual(0);
      expect(response.body.rating).toBeLessThanOrEqual(100);
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await getRequest(app)
        .get('/api/employees/00000000-0000-0000-0000-000000000000/rating')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/companies/:companyId/violation-rules', () => {
    it('should return all violation rules', async () => {
      await createTestViolationRule(companyId, {
        code: 'LATE',
        name: 'Late to work',
        penalty_percent: 5,
      });
      await createTestViolationRule(companyId, {
        code: 'ABSENT',
        name: 'Absent without notice',
        penalty_percent: 10,
      });

      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/violation-rules`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/violation-rules', () => {
    it('should create violation rule', async () => {
      const newRule = {
        company_id: companyId,
        code: 'DRESS_CODE',
        name: 'Dress code violation',
        penalty_percent: 3,
        is_active: true,
      };

      const response = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRule);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        code: newRule.code,
        name: newRule.name,
        penalty_percent: newRule.penalty_percent,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 with duplicate code', async () => {
      const rule = {
        company_id: companyId,
        code: 'DUPLICATE',
        name: 'Duplicate Rule',
        penalty_percent: 5,
      };

      // Create first rule
      await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rule);

      // Try to create duplicate
      const response = await getRequest(app)
        .post('/api/violation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rule);

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('PUT /api/violation-rules/:id', () => {
    it('should update violation rule', async () => {
      const rule = await createTestViolationRule(companyId);

      const updates = {
        name: 'Updated Rule Name',
        penalty_percent: 7,
      };

      const response = await getRequest(app)
        .put(`/api/violation-rules/${rule.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updates);
    });
  });

  describe('DELETE /api/violation-rules/:id', () => {
    it('should deactivate violation rule', async () => {
      const rule = await createTestViolationRule(companyId);

      const response = await getRequest(app)
        .delete(`/api/violation-rules/${rule.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify it's deactivated or deleted
      const getResponse = await getRequest(app)
        .get(`/api/companies/${companyId}/violation-rules`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedRule = getResponse.body.find((r: any) => r.id === rule.id);
      if (deletedRule) {
        expect(deletedRule.is_active).toBe(false);
      }
    });
  });
});





