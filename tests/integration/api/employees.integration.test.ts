import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee, deleteTestCompany } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Employees API Integration', () => {
  let app: Express;
  let authToken: string;
  let companyId: string;
  let adminId: string;

  beforeAll(async () => {
    app = await setupTestServer();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { token, company, admin } = await createTestCompany();
    authToken = token;
    companyId = company.id;
    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanupTestServer();
  });

  describe('GET /api/companies/:companyId/employees', () => {
    it('should return all employees for company', async () => {
      // Arrange
      await createTestEmployee(companyId, { full_name: 'Test Employee 1' });
      await createTestEmployee(companyId, { full_name: 'Test Employee 2' });

      // Act
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 without auth', async () => {
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/employees`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/employees', () => {
    it('should create new employee', async () => {
      const newEmployee = {
        company_id: companyId,
        full_name: 'New Test Employee',
        phone: '+15551234567',
        role: 'employee' as const,
        status: 'active' as const,
      };

      const response = await getRequest(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEmployee);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        full_name: newEmployee.full_name,
        phone: newEmployee.phone,
        role: newEmployee.role,
        company_id: companyId,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 with invalid data', async () => {
      const response = await getRequest(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          full_name: 'Test',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee', async () => {
      const employee = await createTestEmployee(companyId);
      const updates = {
        full_name: 'Updated Name',
        position: 'Senior Developer',
      };

      const response = await getRequest(app)
        .put(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updates);
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await getRequest(app)
        .put('/api/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ full_name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete employee', async () => {
      const employee = await createTestEmployee(companyId);

      const response = await getRequest(app)
        .delete(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await getRequest(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${authToken}`);

      const employeeExists = getResponse.body.find((e: any) => e.id === employee.id);
      expect(employeeExists).toBeUndefined();
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await getRequest(app)
        .delete('/api/employees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});





