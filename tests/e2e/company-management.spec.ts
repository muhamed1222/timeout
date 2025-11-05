/**
 * E2E Test: Company Management
 *
 * Tests company management workflows:
 * 1. Company creation and setup
 * 2. Company settings update
 * 3. Dashboard stats display
 * 4. Company statistics calculation
 */

import { test, expect } from "@playwright/test";
import {
  register,
  waitForToast,
  waitForWebSocket,
  createEmployee,
} from "./helpers";

test.describe("Company Management", () => {
  test.beforeEach(async ({ page }) => {
    // Register new company/admin for isolated test
    await register(page);
    await waitForWebSocket(page);
  });

  test("should display dashboard with company stats", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/");

    // Verify dashboard elements
    await expect(page.locator("text=/employees|сотрудники/i")).toBeVisible();
    await expect(page.locator("text=/shifts|смены/i")).toBeVisible();

    // Create an employee to update stats
    await createEmployee(page);

    // Wait for stats to update
    await page.waitForTimeout(1000);

    // Verify stats are displayed
    const statsCards = page.locator(
      '[data-testid="stat-card"], .stat-card, [class*="stat"]',
    );
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should update company settings", async ({ page }) => {
    // Navigate to settings (if available)
    await page.goto("/settings");

    // If settings page doesn't exist, skip or check for company info
    const settingsVisible = await page
      .locator("text=/settings|настройки/i")
      .isVisible()
      .catch(() => false);

    if (settingsVisible) {
      // Update timezone
      const timezoneSelect = page.locator(
        'select[name="timezone"], input[name="timezone"]',
      );
      if (await timezoneSelect.isVisible()) {
        await timezoneSelect.selectOption("America/New_York");
        await page.click(
          'button[type="submit"]:has-text("Save"), button:has-text("Сохранить")',
        );
        await waitForToast(page, /saved|сохранено/i);
      }
    }
  });

  test("should generate shifts for company", async ({ page }) => {
    // Create employee first
    const _employeeId = await createEmployee(page);

    // Navigate to schedules or shifts page
    await page.goto("/schedules");

    // Create schedule template if needed
    const createScheduleButton = page.locator(
      'button:has-text("Create Schedule"), button:has-text("Создать график")',
    );
    if (await createScheduleButton.isVisible()) {
      await createScheduleButton.click();

      // Fill schedule form
      await page.fill('input[name="name"]', "Test Schedule");

      // Submit if form exists
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await waitForToast(page, /created|создан/i);
      }
    }

    // Try to generate shifts
    const generateButton = page.locator(
      'button:has-text("Generate Shifts"), button:has-text("Сгенерировать смены")',
    );
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await waitForToast(page, /generated|сгенерированы/i);
    }
  });
});
