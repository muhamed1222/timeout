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

  describe('POST /api/employees/:id/photo', () => {
    it('should upload photo for employee', async () => {
      const employee = await createTestEmployee(companyId);
      
      // Create a small test image (1x1 pixel PNG) as base64
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: testImageBase64 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('photo_url');
      expect(response.body.photo_url).toBeTruthy();
      expect(response.body).toHaveProperty('employee');
      expect(response.body.employee.photo_url).toBe(response.body.photo_url);
    });

    it('should return 400 for invalid image format', async () => {
      const employee = await createTestEmployee(companyId);
      
      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: 'invalid-data' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing image field', async () => {
      const employee = await createTestEmployee(companyId);
      
      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent employee', async () => {
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await getRequest(app)
        .post('/api/employees/00000000-0000-0000-0000-000000000000/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: testImageBase64 });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const employee = await createTestEmployee(companyId);
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .send({ image: testImageBase64 });

      expect(response.status).toBe(401);
    });

    it('should return 400 for file size exceeding limit', async () => {
      const employee = await createTestEmployee(companyId);
      
      // Create a large base64 string (simulating >5MB image)
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024); // 6MB

      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: largeBase64 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File size exceeds');
    });

    it('should return 400 for unsupported image type', async () => {
      const employee = await createTestEmployee(companyId);
      
      // GIF is not supported (only jpeg, png, webp)
      const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      const response = await getRequest(app)
        .post(`/api/employees/${employee.id}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: gifBase64 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid file type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty employee list', async () => {
      const response = await getRequest(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should handle update with empty object', async () => {
      const employee = await createTestEmployee(companyId);
      
      const response = await getRequest(app)
        .put(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Should succeed but not change anything
      expect(response.status).toBe(200);
    });

    it('should handle update with only null values', async () => {
      const employee = await createTestEmployee(companyId);
      
      const response = await getRequest(app)
        .put(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ position: null });

      expect(response.status).toBe(200);
    });

    it('should handle very long employee name', async () => {
      const longName = 'A'.repeat(500); // Very long name
      
      const response = await getRequest(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: longName,
          phone: '+15551234567',
          role: 'employee' as const,
          status: 'active' as const,
        });

      // Should either succeed or return validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should handle invalid UUID format', async () => {
      const response = await getRequest(app)
        .get('/api/employees/invalid-uuid-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle cross-company access attempt', async () => {
      // Create another company
      const { token: otherToken, company: otherCompany } = await createTestCompany();
      const employee = await createTestEmployee(companyId);

      // Try to access employee from other company
      const response = await getRequest(app)
        .get(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status);
    });

    it('should handle employee with special characters in name', async () => {
      const specialName = 'Test Employee <>&"\'`;';
      
      const response = await getRequest(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: companyId,
          full_name: specialName,
          phone: '+15551234567',
          role: 'employee' as const,
          status: 'active' as const,
        });

      expect([201, 400]).toContain(response.status);
    });
  });
});





