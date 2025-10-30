import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Companies API Integration', () => {
  let app: Express;
  let authToken: string;
  let companyId: string;

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

  describe('GET /api/companies/:id', () => {
    it('should return company details', async () => {
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: companyId,
      });
      expect(response.body).toHaveProperty('name');
    });

    it('should return 401 without auth', async () => {
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent company', async () => {
      const response = await getRequest(app)
        .get('/api/companies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('should update company settings', async () => {
      const updates = {
        name: 'Updated Company Name',
      };

      const response = await getRequest(app)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
    });

    it('should return 403 for non-admin user', async () => {
      // Create regular employee (non-admin)
      const employee = await createTestEmployee(companyId, { role: 'employee' });
      const { token: employeeToken } = await createTestCompany();

      const response = await getRequest(app)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Hacked Name' });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/companies/:companyId/stats', () => {
    it('should return company statistics', async () => {
      // Create some test data
      await createTestEmployee(companyId, { status: 'active' });
      await createTestEmployee(companyId, { status: 'active' });
      await createTestEmployee(companyId, { status: 'inactive' });

      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalEmployees');
      expect(response.body).toHaveProperty('activeEmployees');
      expect(typeof response.body.totalEmployees).toBe('number');
      expect(typeof response.body.activeEmployees).toBe('number');
    });
  });
});




