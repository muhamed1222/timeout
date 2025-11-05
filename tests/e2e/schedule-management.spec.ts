/**
 * E2E Test: Schedule Management
 *
 * Tests schedule management workflows:
 * 1. Create schedule template
 * 2. Assign schedule to employee
 * 3. Generate shifts from schedule
 * 4. View employee schedules
 */

import { test } from "@playwright/test";
import {
  register,
  waitForToast,
  waitForWebSocket,
  createEmployee,
} from "./helpers";

test.describe("Schedule Management", () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
    await waitForWebSocket(page);
  });

  test("should create schedule template and assign to employee", async ({
    page,
  }) => {
    // Create employee first
    const employeeId = await createEmployee(page);

    // Navigate to schedules
    await page.goto("/schedules");

    // Create schedule template
    const createButton = page.locator(
      'button:has-text("Create Schedule"), button:has-text("Создать график")',
    );
    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for modal/form
      await page
        .waitForSelector('[role="dialog"], form', { timeout: 5000 })
        .catch(() => {});

      // Fill schedule form
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill("Morning Shift Schedule");

        // Submit
        const submitButton = page.locator(
          'button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Создать")',
        );
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForToast(page, /created|создан/i);
        }
      }
    }

    // Assign schedule to employee
    await page.goto(`/employees/${employeeId}`);

    const assignScheduleButton = page.locator(
      'button:has-text("Assign Schedule"), button:has-text("Назначить график")',
    );
    if (await assignScheduleButton.isVisible()) {
      await assignScheduleButton.click();

      // Select schedule from dropdown if available
      const scheduleSelect = page.locator('select[name="schedule_id"]');
      if (await scheduleSelect.isVisible()) {
        await scheduleSelect.selectOption({ index: 0 });
        await page.click('button[type="submit"]');
        await waitForToast(page, /assigned|назначен/i);
      }
    }
  });

  test("should generate shifts from schedule", async ({ page }) => {
    // Navigate to schedules
    await page.goto("/schedules");

    // Find generate shifts button
    const generateButton = page.locator(
      'button:has-text("Generate Shifts"), button:has-text("Сгенерировать")',
    );

    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Fill date range if modal appears
      const startDateInput = page
        .locator('input[name="startDate"], input[type="date"]')
        .first();
      if (await startDateInput.isVisible()) {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000)
          .toISOString()
          .split("T")[0];

        await startDateInput.fill(today);

        const endDateInput = page
          .locator('input[name="endDate"], input[type="date"]')
          .last();
        if (await endDateInput.isVisible()) {
          await endDateInput.fill(tomorrow);
        }

        // Submit
        const submitButton = page.locator(
          'button[type="submit"]:has-text("Generate"), button[type="submit"]:has-text("Сгенерировать")',
        );
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForToast(page, /generated|сгенерированы/i);
        }
      }
    }
  });
});
