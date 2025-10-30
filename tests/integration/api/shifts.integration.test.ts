import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee, createTestShift } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Shifts API Integration', () => {
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

  describe('GET /api/shifts', () => {
    it('should return all shifts for company', async () => {
      await createTestShift(employeeId, { status: 'planned' });
      await createTestShift(employeeId, { status: 'active' });

      const response = await getRequest(app)
        .get('/api/shifts')
        .query({ company_id: companyId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter shifts by employee', async () => {
      await createTestShift(employeeId, { status: 'planned' });
      const otherEmployee = await createTestEmployee(companyId);
      await createTestShift(otherEmployee.id, { status: 'planned' });

      const response = await getRequest(app)
        .get('/api/shifts')
        .query({ employee_id: employeeId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.every((s: any) => s.employee_id === employeeId)).toBe(true);
    });
  });

  describe('POST /api/shifts', () => {
    it('should create new shift', async () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      
      const newShift = {
        employee_id: employeeId,
        planned_start_at: now.toISOString(),
        planned_end_at: endTime.toISOString(),
        status: 'planned' as const,
      };

      const response = await getRequest(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newShift);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        employee_id: employeeId,
        status: 'planned',
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 with invalid dates', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      
      const response = await getRequest(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employee_id: employeeId,
          planned_start_at: now.toISOString(),
          planned_end_at: pastTime.toISOString(), // End before start
          status: 'planned',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/shifts/:id', () => {
    it('should start shift', async () => {
      const shift = await createTestShift(employeeId, { status: 'planned' });
      const now = new Date();

      const response = await getRequest(app)
        .put(`/api/shifts/${shift.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'active',
          actual_start_at: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
      expect(response.body.actual_start_at).toBeTruthy();
    });

    it('should complete shift', async () => {
      const now = new Date();
      const shift = await createTestShift(employeeId, {
        status: 'active',
        actual_start_at: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      });

      const response = await getRequest(app)
        .put(`/api/shifts/${shift.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          actual_end_at: now.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.actual_end_at).toBeTruthy();
    });
  });

  describe('DELETE /api/shifts/:id', () => {
    it('should delete shift', async () => {
      const shift = await createTestShift(employeeId);

      const response = await getRequest(app)
        .delete(`/api/shifts/${shift.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await getRequest(app)
        .get('/api/shifts')
        .query({ employee_id: employeeId })
        .set('Authorization', `Bearer ${authToken}`);

      const shiftExists = getResponse.body.find((s: any) => s.id === shift.id);
      expect(shiftExists).toBeUndefined();
    });
  });
});




