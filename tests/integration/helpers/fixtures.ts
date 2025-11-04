import { db } from '../../../server/repositories/index.js';
import { company, employee, violationRule, shift, ratingPeriod } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Create test company with admin user
 */
export async function createTestCompany(data?: {
  name?: string;
  adminName?: string;
  adminPhone?: string;
}) {
  // Create company
  const [newCompany] = await db
    .insert(company)
    .values({
      name: data?.name || `Test Company ${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  // Create admin employee
  const [adminEmployee] = await db
    .insert(employee)
    .values({
      company_id: newCompany.id,
      full_name: data?.adminName || 'Test Admin',
      phone: data?.adminPhone || `+1234567${Date.now().toString().slice(-3)}`,
      role: 'admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  // Generate test token (simplified for tests)
  const token = generateTestToken(adminEmployee.id, newCompany.id, 'admin');

  return {
    company: newCompany,
    admin: adminEmployee,
    token,
  };
}

/**
 * Create test employee
 */
export async function createTestEmployee(
  companyId: string,
  data?: {
    full_name?: string;
    phone?: string;
    role?: 'admin' | 'manager' | 'employee';
    status?: 'active' | 'inactive';
    position?: string;
    telegram_user_id?: string;
  }
) {
  const [newEmployee] = await db
    .insert(employee)
    .values({
      company_id: companyId,
      full_name: data?.full_name || `Test Employee ${Date.now()}`,
      phone: data?.phone || `+1234567${Date.now().toString().slice(-3)}`,
      role: data?.role || 'employee',
      status: data?.status || 'active',
      position: data?.position,
      telegram_user_id: data?.telegram_user_id,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return newEmployee;
}

/**
 * Create test violation rule
 */
export async function createTestViolationRule(
  companyId: string,
  data?: {
    code?: string;
    name?: string;
    penalty_percent?: number;
    is_active?: boolean;
  }
) {
  const [rule] = await db
    .insert(violationRule)
    .values({
      company_id: companyId,
      code: data?.code || `TEST-${Date.now()}`,
      name: data?.name || 'Test Violation',
      penalty_percent: data?.penalty_percent || 5,
      is_active: data?.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return rule;
}

/**
 * Create test shift
 */
export async function createTestShift(
  employeeId: string,
  data?: {
    status?: 'planned' | 'active' | 'completed' | 'cancelled';
    planned_start_at?: Date;
    planned_end_at?: Date;
    actual_start_at?: Date;
    actual_end_at?: Date;
  }
) {
  const now = new Date();
  const [newShift] = await db
    .insert(shift)
    .values({
      employee_id: employeeId,
      status: data?.status || 'planned',
      planned_start_at: data?.planned_start_at || now,
      planned_end_at: data?.planned_end_at || new Date(now.getTime() + 8 * 60 * 60 * 1000),
      actual_start_at: data?.actual_start_at,
      actual_end_at: data?.actual_end_at,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return newShift;
}

/**
 * Create test rating period
 */
export async function createTestRatingPeriod(
  companyId: string,
  data?: {
    name?: string;
    start_date?: Date;
    end_date?: Date;
  }
) {
  const now = new Date();
  const [period] = await db
    .insert(ratingPeriod)
    .values({
      company_id: companyId,
      name: data?.name || `Test Period ${Date.now()}`,
      start_date: data?.start_date || now,
      end_date: data?.end_date || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return period;
}

/**
 * Generate test JWT token (simplified)
 */
export function generateTestToken(
  employeeId: string,
  companyId: string,
  role: string
): string {
  // In a real scenario, use proper JWT signing with a test secret
  // For now, we'll create a simple base64 encoded payload
  const payload = {
    employeeId,
    companyId,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  
  return `TEST_TOKEN_${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

/**
 * Delete test company and all related data
 */
export async function deleteTestCompany(companyId: string) {
  await db.delete(company).where(eq(company.id, companyId));
}

/**
 * Delete test employee
 */
export async function deleteTestEmployee(employeeId: string) {
  await db.delete(employee).where(eq(employee.id, employeeId));
}







