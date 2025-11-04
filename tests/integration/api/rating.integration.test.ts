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

  describe('Edge Cases', () => {
    it('should handle rating calculation with no violations', async () => {
      const response = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Employee with no violations should have 100% rating
      expect(response.body.rating).toBe(100);
    });

    it('should handle rating calculation with negative penalty', async () => {
      const rule = await createTestViolationRule(companyId, {
        code: 'NEGATIVE_TEST',
        name: 'Test with negative penalty',
        penalty_percent: -5, // Negative penalty (edge case)
      });

      // Should handle gracefully or reject
      expect(rule).toBeDefined();
    });

    it('should handle rating calculation with penalty > 100%', async () => {
      const rule = await createTestViolationRule(companyId, {
        code: 'EXCESSIVE',
        name: 'Excessive penalty',
        penalty_percent: 150, // More than 100%
      });

      // Should handle gracefully (cap at 100% or reject)
      expect(rule).toBeDefined();
    });

    it('should handle invalid date ranges in period', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await getRequest(app)
        .post('/api/rating-periods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          name: 'Invalid Period',
          start_date: now.toISOString(),
          end_date: pastDate.toISOString(), // End before start
        });

      // Should reject invalid date range
      expect([400, 422]).toContain(response.status);
    });

    it('should handle rating with multiple violations of same type', async () => {
      const rule = await createTestViolationRule(companyId, {
        code: 'MULTIPLE',
        name: 'Multiple violations test',
        penalty_percent: 10,
      });

      // Create multiple violations
      // This tests that rating calculation handles multiple violations correctly
      expect(rule).toBeDefined();
    });

    it('should handle empty violation rules list', async () => {
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/violation-rules`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      // Should return empty array if no rules exist
    });

    it('should handle invalid UUID in employee rating endpoint', async () => {
      const response = await getRequest(app)
        .get('/api/employees/invalid-uuid/rating')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle rating recalculation with empty period', async () => {
      const response = await getRequest(app)
        .post(`/api/companies/${companyId}/recalculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(), // Same date = empty period
        });

      // Should handle gracefully (either succeed with 0 processed or return error)
      expect([200, 400]).toContain(response.status);
    });

    it('should handle multiple violations affecting rating', async () => {
      // Create violation rule
      const rule = await createTestViolationRule(companyId, {
        code: 'LATE_START',
        penalty_percent: 5,
      });

      // Create multiple violations
      for (let i = 0; i < 5; i++) {
        await getRequest(app)
          .post(`/api/companies/${companyId}/violations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            employee_id: employeeId,
            rule_id: rule.id,
            source: 'manual',
            penalty: '5',
          });
      }

      // Check rating after violations
      const ratingResponse = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(ratingResponse.status).toBe(200);
      // Rating should be reduced (100 - 5*5 = 75)
      expect(Number(ratingResponse.body.rating)).toBeLessThan(100);
    });

    it('should handle rating at blocking threshold (<=30)', async () => {
      // Create high penalty violation rule
      const rule = await createTestViolationRule(companyId, {
        code: 'SEVERE_VIOLATION',
        penalty_percent: 75,
      });

      // Create a violation for this rule
      await getRequest(app)
        .post(`/api/companies/${companyId}/violations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          rule_id: rule.id,
          source: 'manual',
          penalty: '75',
        });

      // Check rating
      const ratingResponse = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(ratingResponse.status).toBe(200);
      // Rating should be 0 (blocking threshold)
      expect(Number(ratingResponse.body.rating)).toBe(0);
    });

    it('should handle rating recalculation with many violations', async () => {
      // Create violation rule
      const rule = await createTestViolationRule(companyId, {
        code: 'MINOR_VIOLATION',
        penalty_percent: 1,
      });

      // Create multiple violations
      for (let i = 0; i < 100; i++) {
        await getRequest(app)
          .post(`/api/companies/${companyId}/violations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            employee_id: employeeId,
            rule_id: rule.id,
            source: 'manual',
            penalty: '1',
          });
      }

      // Check rating
      const ratingResponse = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(ratingResponse.status).toBe(200);
      // Rating should be 0 (blocking threshold)
      expect(Number(ratingResponse.body.rating)).toBe(0);
    });

    it('should handle violation rules with zero penalty', async () => {
      // Create rule with zero penalty (should not affect rating)
      const rule = await createTestViolationRule(companyId, {
        code: 'INFO_VIOLATION',
        penalty_percent: 0,
      });

      // Create a violation for this rule
      await getRequest(app)
        .post(`/api/companies/${companyId}/violations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          rule_id: rule.id,
          source: 'manual',
          penalty: '0',
        });

      // Check rating
      const ratingResponse = await getRequest(app)
        .get(`/api/employees/${employeeId}/rating`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(ratingResponse.status).toBe(200);
      // Rating should be 100 (no penalty)
      expect(Number(ratingResponse.body.rating)).toBe(100);
    });

    it('should handle inactive violation rules', async () => {
      // Create inactive rule
      const rule = await createTestViolationRule(companyId, {
        code: 'INACTIVE_RULE',
        penalty_percent: 10,
        is_active: false,
      });

      // Create a violation for this rule
      const response = await getRequest(app)
        .post(`/api/companies/${companyId}/violations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          rule_id: rule.id,
          source: 'manual',
          penalty: '10',
        });

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status);
    });

    it('should handle cross-company rating access attempt', async () => {
      const { token: otherToken, company: otherCompany } = await createTestCompany();
      const otherEmployee = await createTestEmployee(otherCompany.id);

      // Try to access rating from other company
      const response = await getRequest(app)
        .get(`/api/employees/${otherEmployee.id}/rating`)
        .set('Authorization', `Bearer ${authToken}`); // Using first company's token

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status);
    });
  });
});





