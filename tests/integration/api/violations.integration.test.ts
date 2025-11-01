/**
 * Integration tests for Violations API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Violations API Integration', () => {
  let app: Express;
  let authToken: string;
  let companyId: string;
  let employeeId: string;
  let ruleId: string;

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

    // Create a violation rule
    const ruleResponse = await getRequest(app)
      .post('/api/violation-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        company_id: companyId,
        code: 'LATE_START',
        name: 'Late Start',
        description: 'Employee arrived late',
        penalty_percent: 5,
        auto_detectable: true,
        is_active: true,
      });
    ruleId = ruleResponse.body.id;
  });

  afterAll(async () => {
    await cleanupTestServer();
  });

  describe('POST /api/violations', () => {
    it('should create a violation', async () => {
      const response = await getRequest(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          company_id: companyId,
          rule_id: ruleId,
          source: 'manual',
          penalty: '5',
          reason: 'Employee was 15 minutes late',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.employee_id).toBe(employeeId);
      expect(response.body.rule_id).toBe(ruleId);
    });

    it('should return 400 with invalid data', async () => {
      const response = await getRequest(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          employee_id: employeeId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await getRequest(app)
        .post('/api/violations')
        .send({
          employee_id: employeeId,
          company_id: companyId,
          rule_id: ruleId,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/violations', () => {
    it('should return violations for employee', async () => {
      // Create a violation first
      await getRequest(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          company_id: companyId,
          rule_id: ruleId,
          source: 'manual',
          penalty: '5',
        });

      const response = await getRequest(app)
        .get(`/api/violations?employee_id=${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return violations for company', async () => {
      await getRequest(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          company_id: companyId,
          rule_id: ruleId,
          source: 'manual',
          penalty: '5',
        });

      const response = await getRequest(app)
        .get(`/api/violations?company_id=${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

