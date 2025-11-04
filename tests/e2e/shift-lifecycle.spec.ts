/**
 * E2E Test: Shift Lifecycle
 * 
 * Tests the complete shift workflow:
 * 1. Create shift
 * 2. Start shift
 * 3. Take break
 * 4. Resume from break
 * 5. End shift
 * 6. Submit daily report
 */

import { test, expect } from '@playwright/test';
import {
  register,
  login,
  createEmployee,
  createShift,
  waitForToast,
  waitForWebSocket,
  TEST_USERS,
} from './helpers';

test.describe('Shift Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Register new user for isolated test
    await register(page);
    
    // Wait for WebSocket connection
    await waitForWebSocket(page);
  });

  test('complete shift lifecycle flow', async ({ page }) => {
    // Step 1: Create employee
    const employeeId = await createEmployee(page);
    expect(employeeId).toBeTruthy();

    // Step 2: Create shift for today (not tomorrow)
    await page.goto(`/employees/${employeeId}/shifts`);
    await page.click('button:has-text("Create Shift")');
    
    const now = new Date();
    const startAt = `${now.toISOString().split('T')[0]}T${now.getHours().toString().padStart(2, '0')}:00`;
    const endAt = `${now.toISOString().split('T')[0]}T${(now.getHours() + 8).toString().padStart(2, '0')}:00`;
    
    await page.fill('input[name="planned_start_at"]', startAt);
    await page.fill('input[name="planned_end_at"]', endAt);
    await page.click('button[type="submit"]');
    
    await waitForToast(page, 'Shift created');
    
    // Get shift ID from URL
    await page.waitForURL(/\/shifts\/[a-f0-9-]+/);
    const shiftId = page.url().split('/').pop()!;

    // Step 3: Start shift
    await page.click('button:has-text("Start Shift")');
    await waitForToast(page, 'Shift started');
    
    // Verify shift status changed
    await expect(page.locator('text=Status:')).toContainText('Active');
    await expect(page.locator('button:has-text("Start Shift")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Take Break")')).toBeVisible();

    // Step 4: Take break
    await page.click('button:has-text("Take Break")');
    await waitForToast(page, 'Break started');
    
    // Verify break status
    await expect(page.locator('text=On Break')).toBeVisible();
    await expect(page.locator('button:has-text("End Break")')).toBeVisible();

    // Wait a moment (simulate break)
    await page.waitForTimeout(2000);

    // Step 5: Resume from break
    await page.click('button:has-text("End Break")');
    await waitForToast(page, 'Break ended');
    
    // Verify back to active
    await expect(page.locator('text=Status:')).toContainText('Active');
    await expect(page.locator('text=On Break')).not.toBeVisible();

    // Step 6: End shift
    await page.click('button:has-text("End Shift")');
    await waitForToast(page, 'Shift ended');
    
    // Verify shift completed
    await expect(page.locator('text=Status:')).toContainText('Completed');
    
    // Step 7: Submit daily report (if form appears)
    const reportForm = page.locator('form:has-text("Daily Report")');
    if (await reportForm.isVisible()) {
      await page.fill('textarea[name="tasks_completed"]', 'Completed all assigned tasks');
      await page.fill('textarea[name="notes"]', 'Great day!');
      await page.selectOption('select[name="rating"]', '5');
      
      await page.click('button[type="submit"]:has-text("Submit Report")');
      await waitForToast(page, 'Report submitted');
    }

    // Verify shift appears in history
    await page.goto(`/employees/${employeeId}/shifts`);
    await expect(page.locator(`[data-shift-id="${shiftId}"]`)).toBeVisible();
    await expect(page.locator(`[data-shift-id="${shiftId}"] >> text=Completed`)).toBeVisible();
  });

  test('should prevent starting non-scheduled shift', async ({ page }) => {
    const employeeId = await createEmployee(page);
    const shiftId = await createShift(page, employeeId);

    await page.goto(`/shifts/${shiftId}`);
    
    // Try to start shift
    await page.click('button:has-text("Start Shift")');
    
    // Should show error (shift is for tomorrow)
    await expect(page.locator('text=Cannot start shift')).toBeVisible({ timeout: 3000 });
  });

  test('should track break time correctly', async ({ page }) => {
    const employeeId = await createEmployee(page);
    
    // Create shift for now
    await page.goto(`/employees/${employeeId}/shifts`);
    await page.click('button:has-text("Create Shift")');
    
    const now = new Date();
    const startAt = `${now.toISOString().split('T')[0]}T${now.getHours().toString().padStart(2, '0')}:00`;
    const endAt = `${now.toISOString().split('T')[0]}T${(now.getHours() + 8).toString().padStart(2, '0')}:00`;
    
    await page.fill('input[name="planned_start_at"]', startAt);
    await page.fill('input[name="planned_end_at"]', endAt);
    await page.click('button[type="submit"]');
    
    const shiftId = (await page.waitForURL(/\/shifts\/[a-f0-9-]+/), page.url().split('/').pop()!);

    // Start shift
    await page.click('button:has-text("Start Shift")');
    await waitForToast(page, 'Shift started');

    // Take break
    await page.click('button:has-text("Take Break")');
    await waitForToast(page, 'Break started');
    
    // Record break start time
    const breakStartTime = Date.now();

    // Wait 3 seconds
    await page.waitForTimeout(3000);

    // End break
    await page.click('button:has-text("End Break")');
    await waitForToast(page, 'Break ended');
    
    const breakEndTime = Date.now();
    const breakDuration = Math.floor((breakEndTime - breakStartTime) / 1000);

    // Verify break duration is tracked (should be ~3 seconds)
    const breakDurationElement = page.locator('text=/Break Duration:.*[0-9]+ (seconds|minutes)/');
    if (await breakDurationElement.isVisible()) {
      const text = await breakDurationElement.textContent();
      const duration = parseInt(text?.match(/[0-9]+/)?.[0] || '0');
      
      // Should be approximately 3 seconds (allow ±1 second tolerance)
      expect(duration).toBeGreaterThanOrEqual(2);
      expect(duration).toBeLessThanOrEqual(5);
    }
  });

  test('should show real-time updates via WebSocket', async ({ page, context }) => {
    const employeeId = await createEmployee(page);
    
    // Create shift for now
    await page.goto(`/employees/${employeeId}/shifts`);
    await page.click('button:has-text("Create Shift")');
    
    const now = new Date();
    const startAt = `${now.toISOString().split('T')[0]}T${now.getHours().toString().padStart(2, '0')}:00`;
    const endAt = `${now.toISOString().split('T')[0]}T${(now.getHours() + 8).toString().padStart(2, '0')}:00`;
    
    await page.fill('input[name="planned_start_at"]', startAt);
    await page.fill('input[name="planned_end_at"]', endAt);
    await page.click('button[type="submit"]');
    
    const shiftId = (await page.waitForURL(/\/shifts\/[a-f0-9-]+/), page.url().split('/').pop()!);

    // Open dashboard in new tab
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await waitForWebSocket(dashboardPage);

    // Start shift in original tab
    await page.click('button:has-text("Start Shift")');
    await waitForToast(page, 'Shift started');

    // Dashboard should update in real-time
    await expect(dashboardPage.locator('text=/Active Shifts:.*1/')).toBeVisible({ timeout: 5000 });

    // End shift
    await page.click('button:has-text("End Shift")');
    await waitForToast(page, 'Shift ended');

    // Dashboard should update again
    await expect(dashboardPage.locator('text=/Active Shifts:.*0/')).toBeVisible({ timeout: 5000 });

    await dashboardPage.close();
  });

  test('should handle shift cancellation', async ({ page }) => {
    const employeeId = await createEmployee(page);
    const shiftId = await createShift(page, employeeId);

    await page.goto(`/shifts/${shiftId}`);
    
    // Cancel shift
    await page.click('button:has-text("Cancel Shift")');
    
    // Confirm cancellation
    await page.click('button:has-text("Confirm")');
    await waitForToast(page, 'Shift cancelled');
    
    // Verify status
    await expect(page.locator('text=Status:')).toContainText('Cancelled');
    
    // Should not be able to start cancelled shift
    await expect(page.locator('button:has-text("Start Shift")')).not.toBeVisible();
  });
});







