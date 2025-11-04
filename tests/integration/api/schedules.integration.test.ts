import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';
import { createTestCompany, createTestEmployee, createTestShift } from '../helpers/fixtures.js';
import { cleanDatabase } from '../helpers/testDatabase.js';
import type { Express } from 'express';

describe('Schedules API Integration', () => {
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

  describe('GET /api/schedules', () => {
    it('should return schedule for date range', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await createTestShift(employeeId, {
        planned_start_at: now,
        status: 'planned',
      });

      const response = await getRequest(app)
        .get('/api/schedules')
        .query({
          company_id: companyId,
          start_date: now.toISOString(),
          end_date: tomorrow.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter by employee', async () => {
      await createTestShift(employeeId, { status: 'planned' });
      const otherEmployee = await createTestEmployee(companyId);
      await createTestShift(otherEmployee.id, { status: 'planned' });

      const response = await getRequest(app)
        .get('/api/schedules')
        .query({ employee_id: employeeId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/schedules/bulk', () => {
    it('should create multiple shifts', async () => {
      const shifts = [
        {
          employee_id: employeeId,
          planned_start_at: new Date().toISOString(),
          planned_end_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          status: 'planned' as const,
        },
        {
          employee_id: employeeId,
          planned_start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          planned_end_at: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
          status: 'planned' as const,
        },
      ];

      const response = await getRequest(app)
        .post('/api/schedules/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ shifts });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /api/schedules/conflicts', () => {
    it('should detect schedule conflicts', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      // Create overlapping shifts
      await createTestShift(employeeId, {
        planned_start_at: now,
        planned_end_at: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      });

      await createTestShift(employeeId, {
        planned_start_at: later,
        planned_end_at: new Date(later.getTime() + 8 * 60 * 60 * 1000),
      });

      const response = await getRequest(app)
        .get('/api/schedules/conflicts')
        .query({ company_id: companyId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });
});







