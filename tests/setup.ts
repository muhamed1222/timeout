/**
 * Vitest Global Setup
 * Runs before all tests
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.BOT_API_SECRET = 'test-secret-key';
  process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  process.env.TELEGRAM_BOT_USERNAME = 'test_bot';
  process.env.PORT = '5000';

  // Suppress console logs in tests (optional)
  if (process.env.VERBOSE_TESTS !== 'true') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep console.error for debugging
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const testUtils = {
  /**
   * Wait for a condition to be true
   */
  waitFor: async (
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  },

  /**
   * Create a mock employee
   */
  createMockEmployee: (overrides = {}) => ({
    id: 'emp-test-1',
    company_id: 'comp-test-1',
    full_name: 'Test Employee',
    position: 'Developer',
    telegram_user_id: null,
    status: 'active',
    tz: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }),

  /**
   * Create a mock shift
   */
  createMockShift: (overrides = {}) => ({
    id: 'shift-test-1',
    employee_id: 'emp-test-1',
    planned_start_at: new Date('2025-10-29T09:00:00Z'),
    planned_end_at: new Date('2025-10-29T17:00:00Z'),
    actual_start_at: null,
    actual_end_at: null,
    status: 'planned',
    created_at: new Date('2025-10-28T00:00:00Z'),
    ...overrides,
  }),

  /**
   * Create a mock violation rule
   */
  createMockViolationRule: (overrides = {}) => ({
    id: 'rule-test-1',
    company_id: 'comp-test-1',
    code: 'late',
    name: 'Late Start',
    penalty_percent: '5.00',
    auto_detectable: true,
    is_active: true,
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }),

  /**
   * Create a mock violation
   */
  createMockViolation: (overrides = {}) => ({
    id: 'viol-test-1',
    employee_id: 'emp-test-1',
    company_id: 'comp-test-1',
    rule_id: 'rule-test-1',
    source: 'auto',
    reason: 'Auto-detected violation',
    penalty: '5.00',
    created_by: null,
    created_at: new Date('2025-10-29T09:20:00Z'),
    ...overrides,
  }),

  /**
   * Create a mock exception
   */
  createMockException: (overrides = {}) => ({
    id: 'exc-test-1',
    employee_id: 'emp-test-1',
    date: '2025-10-29',
    kind: 'late_start',
    severity: 1,
    details: {},
    resolved_at: null,
    violation_id: null,
    ...overrides,
  }),

  /**
   * Create a mock company
   */
  createMockCompany: (overrides = {}) => ({
    id: 'comp-test-1',
    name: 'Test Company',
    timezone: 'UTC',
    locale: 'en',
    privacy_settings: {},
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }),
};

// Make test utils available globally
(global as any).testUtils = testUtils;

