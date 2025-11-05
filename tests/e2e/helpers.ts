/**
 * E2E Test Helpers
 * Shared utilities for Playwright tests
 */

import { Page, expect } from "@playwright/test";

/**
 * Test user credentials
 */
export const TEST_USERS = {
  admin: {
    email: "admin@test.com",
    password: "TestPass123",
    full_name: "Test Admin",
    company_name: "Test Company",
  },
  employee: {
    full_name: "Test Employee",
    position: "Software Engineer",
  },
};

/**
 * Login to the application
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/);
}

/**
 * Register new user and company
 */
export async function register(page: Page) {
  await page.goto("/register");

  await page.fill('input[name="full_name"]', TEST_USERS.admin.full_name);
  await page.fill('input[name="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"]', TEST_USERS.admin.password);
  await page.fill('input[name="company_name"]', TEST_USERS.admin.company_name);

  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/);
}

/**
 * Create employee via UI
 */
export async function createEmployee(
  page: Page,
  employeeData = TEST_USERS.employee,
) {
  await page.goto("/employees");
  await page.click('button:has-text("Add Employee")');

  // Fill employee form
  await page.fill('input[name="full_name"]', employeeData.full_name);
  await page.fill('input[name="position"]', employeeData.position);

  await page.click('button[type="submit"]');

  // Wait for success message
  await expect(page.locator("text=Employee created")).toBeVisible({
    timeout: 5000,
  });

  // Get employee ID from URL or response
  await page.waitForURL(/\/employees\/[a-f0-9-]+/);
  const url = page.url();
  const employeeId = url.split("/").pop();

  return employeeId;
}

/**
 * Create shift for employee
 */
export async function createShift(
  page: Page,
  employeeId: string,
  options: {
    startAt?: string;
    endAt?: string;
  } = {},
) {
  await page.goto(`/employees/${employeeId}/shifts`);
  await page.click('button:has-text("Create Shift")');

  // Fill shift form
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startAt =
    options.startAt || `${tomorrow.toISOString().split("T")[0]}T09:00`;
  const endAt =
    options.endAt || `${tomorrow.toISOString().split("T")[0]}T17:00`;

  await page.fill('input[name="planned_start_at"]', startAt);
  await page.fill('input[name="planned_end_at"]', endAt);

  await page.click('button[type="submit"]');

  // Wait for success
  await expect(page.locator("text=Shift created")).toBeVisible({
    timeout: 5000,
  });

  // Get shift ID
  await page.waitForURL(/\/shifts\/[a-f0-9-]+/);
  const url = page.url();
  const shiftId = url.split("/").pop();

  return shiftId;
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: string) {
  await expect(
    page.locator(`[role="status"]:has-text("${message}")`),
  ).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocket(page: Page) {
  // Wait for "Live" indicator
  await expect(page.locator("text=Live")).toBeVisible({ timeout: 10000 });
}

/**
 * Clear database (for isolated tests)
 */
export async function clearDatabase(page: Page) {
  // This would call a test-only API endpoint
  // For now, we'll use isolated test databases per test
  if (process.env.TEST_DATABASE_URL) {
    // Reset database via API
    await page.request.post("/api/test/reset-database", {
      headers: {
        "X-Test-Secret": process.env.TEST_SECRET || "test-secret",
      },
    });
  }
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for API call
 */
export async function waitForApiCall(page: Page, urlPattern: string) {
  return page.waitForRequest((request) => {
    return request.url().includes(urlPattern);
  });
}

/**
 * Get CSRF token from page
 */
export async function getCsrfToken(page: Page): Promise<string> {
  const response = await page.request.get("/api/csrf-token");
  const data = await response.json();
  return data.token;
}

/**
 * Check if element is visible
 */
export async function isVisible(
  page: Page,
  selector: string,
): Promise<boolean> {
  try {
    await expect(page.locator(selector)).toBeVisible({ timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `tests/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}
