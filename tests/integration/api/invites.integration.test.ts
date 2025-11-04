/**
 * Integration tests for Employee Invites API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Employee Invites API Integration', () => {
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

  describe('POST /api/employee-invites', () => {
    it('should create an invite', async () => {
      const response = await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: 'New Employee',
          position: 'Developer',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('deep_link');
      expect(response.body.code).toHaveLength(32);
    });

    it('should return 401 without auth', async () => {
      const response = await getRequest(app)
        .post('/api/employee-invites')
        .send({ company_id: companyId });

      expect(response.status).toBe(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/employee-invites/:code/link', () => {
    it('should return invite link', async () => {
      // First create an invite
      const createResponse = await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: 'Test Employee',
        });

      const inviteCode = createResponse.body.code;

      const response = await getRequest(app)
        .get(`/api/employee-invites/${inviteCode}/link`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deep_link');
      expect(response.body).toHaveProperty('qr_code_url');
      expect(response.body.deep_link).toContain(inviteCode);
    });

    it('should return 404 for non-existent invite', async () => {
      const response = await getRequest(app)
        .get('/api/employee-invites/invalidcode1234567890123456/link');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/employee-invites', () => {
    it('should return invites for company', async () => {
      // Create some invites
      await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: 'Employee 1',
        });

      await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: 'Employee 2',
        });

      const response = await getRequest(app)
        .get(`/api/employee-invites?company_id=${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/employee-invites/:code/use', () => {
    it('should use an invite', async () => {
      // Create an invite
      const createResponse = await getRequest(app)
        .post('/api/employee-invites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: 'New Employee',
        });

      const inviteCode = createResponse.body.code;

      const response = await getRequest(app)
        .post(`/api/employee-invites/${inviteCode}/use`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('used_at');
    });

    it('should return 404 for non-existent invite', async () => {
      const response = await getRequest(app)
        .post('/api/employee-invites/invalidcode1234567890123456/use')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
        });

      expect(response.status).toBe(404);
    });
  });
});



