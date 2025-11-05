/**
 * E2E Test: Rating System
 * 
 * Tests the rating system workflow:
 * 1. Violation detection
 * 2. Rating calculation
 * 3. Exception creation
 * 4. Exception resolution
 * 5. Rating recalculation
 */

import { test, expect } from '@playwright/test';
import {
  register,
  createEmployee,
  createShift,
  waitForToast,
  waitForWebSocket,
} from './helpers';

test.describe('Rating System', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
    await waitForWebSocket(page);
  });

  test('should update rating after violation', async ({ page }) => {
    // Create employee
    const employeeId = await createEmployee(page);

    // Check initial rating
    await page.goto(`/employees/${employeeId}`);
    const initialRating = await page.locator('[data-testid="employee-rating"]').textContent();
    expect(initialRating).toContain('100'); // Default rating

    // Create violation manually
    await page.click('button:has-text("Add Violation")');
    
    await page.selectOption('select[name="type"]', 'late_start');
    await page.fill('input[name="severity"]', '5');
    await page.fill('textarea[name="description"]', 'Employee started 20 minutes late without notice');
    
    await page.click('button[type="submit"]:has-text("Create Violation")');
    await waitForToast(page, 'Violation created');

    // Rating should decrease
    await page.waitForTimeout(1000); // Wait for rating recalculation
    await page.reload();
    
    const newRating = await page.locator('[data-testid="employee-rating"]').textContent();
    const newRatingValue = parseInt(newRating?.match(/\d+/)?.[0] || '100');
    
    expect(newRatingValue).toBeLessThan(100);
    expect(newRatingValue).toBeGreaterThan(0);
  });

  test('should create exception and restore rating', async ({ page }) => {
    const employeeId = await createEmployee(page);

    // Create violation
    await page.goto(`/employees/${employeeId}`);
    await page.click('button:has-text("Add Violation")');
    
    await page.selectOption('select[name="type"]', 'late_start');
    await page.fill('input[name="severity"]', '5');
    await page.fill('textarea[name="description"]', 'Late arrival');
    await page.click('button[type="submit"]:has-text("Create Violation")');
    
    await waitForToast(page, 'Violation created');
    await page.reload();

    // Get rating after violation
    const ratingAfterViolation = await page.locator('[data-testid="employee-rating"]').textContent();
    const ratingValue = parseInt(ratingAfterViolation?.match(/\d+/)?.[0] || '100');
    
    expect(ratingValue).toBeLessThan(100);

    // Go to violations page
    await page.goto(`/employees/${employeeId}/violations`);
    
    // Create exception for the violation
    await page.click('button:has-text("Create Exception")').first();
    
    await page.selectOption('select[name="kind"]', 'technical_issue');
    await page.fill('textarea[name="description"]', 'Traffic jam due to accident on highway');
    
    await page.click('button[type="submit"]:has-text("Submit Exception")');
    await waitForToast(page, 'Exception created');

    // Exception should appear in exceptions list
    await page.goto(`/employees/${employeeId}/exceptions`);
    await expect(page.locator('text=Traffic jam')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();

    // Resolve exception (approve)
    await page.click('button:has-text("Resolve")').first();
    
    await page.fill('textarea[name="resolution"]', 'Approved - valid reason');
    await page.check('input[name="approved"]');
    
    await page.click('button[type="submit"]:has-text("Resolve Exception")');
    await waitForToast(page, 'Exception resolved');

    // Rating should be restored
    await page.goto(`/employees/${employeeId}`);
    const restoredRating = await page.locator('[data-testid="employee-rating"]').textContent();
    const restoredValue = parseInt(restoredRating?.match(/\d+/)?.[0] || '0');
    
    expect(restoredValue).toBeGreaterThan(ratingValue);
  });

  test('should show rating history', async ({ page }) => {
    const employeeId = await createEmployee(page);

    // Create multiple violations
    for (let i = 0; i < 3; i++) {
      await page.goto(`/employees/${employeeId}`);
      await page.click('button:has-text("Add Violation")');
      
      await page.selectOption('select[name="type"]', 'late_start');
      await page.fill('input[name="severity"]', String(i + 3));
      await page.fill('textarea[name="description"]', `Violation ${i + 1}`);
      
      await page.click('button[type="submit"]:has-text("Create Violation")');
      await waitForToast(page, 'Violation created');
      
      await page.waitForTimeout(500);
    }

    // View rating history
    await page.goto(`/employees/${employeeId}/rating-history`);
    
    // Should show rating changes over time
    await expect(page.locator('[data-testid="rating-chart"]')).toBeVisible();
    
    // Should show list of changes
    const ratingEntries = page.locator('[data-testid="rating-entry"]');
    const count = await ratingEntries.count();
    
    expect(count).toBeGreaterThanOrEqual(3); // At least 3 violations
  });

  test('automatic violation detection for late start', async ({ page }) => {
    const employeeId = await createEmployee(page);
    
    // Create shift that should have started 30 minutes ago
    await page.goto(`/employees/${employeeId}/shifts`);
    await page.click('button:has-text("Create Shift")');
    
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    const startAt = thirtyMinsAgo.toISOString().slice(0, 16);
    const endAt = new Date(now.getTime() + 7.5 * 60 * 60 * 1000).toISOString().slice(0, 16);
    
    await page.fill('input[name="planned_start_at"]', startAt);
    await page.fill('input[name="planned_end_at"]', endAt);
    await page.click('button[type="submit"]');
    
    const shiftId = (await page.waitForURL(/\/shifts\/[a-f0-9-]+/), page.url().split('/').pop()!);

    // Start shift now (30 minutes late)
    await page.click('button:has-text("Start Shift")');
    await waitForToast(page, 'Shift started');

    // Wait for automatic violation detection (runs every minute)
    await page.waitForTimeout(65000); // 65 seconds to ensure monitoring ran

    // Check violations
    await page.goto(`/employees/${employeeId}/violations`);
    
    // Should have auto-detected late start violation
    const lateStartViolation = page.locator('text=late_start');
    await expect(lateStartViolation).toBeVisible({ timeout: 10000 });
    
    // Verify it's marked as automatic
    await expect(page.locator('[data-source="auto"]')).toBeVisible();
  });

  test('should filter violations by type', async ({ page }) => {
    const employeeId = await createEmployee(page);

    // Create different types of violations
    const violationTypes = ['late_start', 'long_break', 'early_end'];
    
    for (const type of violationTypes) {
      await page.goto(`/employees/${employeeId}`);
      await page.click('button:has-text("Add Violation")');
      
      await page.selectOption('select[name="type"]', type);
      await page.fill('input[name="severity"]', '3');
      await page.fill('textarea[name="description"]', `Test ${type} violation`);
      
      await page.click('button[type="submit"]:has-text("Create Violation")');
      await waitForToast(page, 'Violation created');
    }

    // Go to violations page
    await page.goto(`/employees/${employeeId}/violations`);
    
    // Should see all violations
    await expect(page.locator('[data-testid="violation-item"]')).toHaveCount(3);

    // Filter by type
    await page.selectOption('select[name="filter-type"]', 'late_start');
    
    // Should only show late_start violations
    await expect(page.locator('[data-testid="violation-item"]')).toHaveCount(1);
    await expect(page.locator('text=late_start')).toBeVisible();
  });

  test('should show company-wide rating leaderboard', async ({ page }) => {
    // Create multiple employees
    const employee1Id = await createEmployee(page, { full_name: 'John Doe', position: 'Engineer' });
    const employee2Id = await createEmployee(page, { full_name: 'Jane Smith', position: 'Designer' });
    const employee3Id = await createEmployee(page, { full_name: 'Bob Johnson', position: 'Manager' });

    // Create violations for employee2 (lower rating)
    await page.goto(`/employees/${employee2Id}`);
    await page.click('button:has-text("Add Violation")');
    await page.selectOption('select[name="type"]', 'late_start');
    await page.fill('input[name="severity"]', '7');
    await page.fill('textarea[name="description"]', 'Severe violation');
    await page.click('button[type="submit"]:has-text("Create Violation")');
    await waitForToast(page, 'Violation created');

    // View leaderboard
    await page.goto('/dashboard/ratings');
    
    // Should show all employees ranked by rating
    await expect(page.locator('[data-testid="leaderboard-entry"]')).toHaveCount(3);
    
    // Employee with highest rating should be first
    const firstEmployee = page.locator('[data-testid="leaderboard-entry"]').first();
    await expect(firstEmployee).toContainText('100'); // Perfect rating

    // Employee with violation should be lower
    const employee2Entry = page.locator(`[data-employee-id="${employee2Id}"]`);
    const rating = await employee2Entry.locator('[data-testid="rating"]').textContent();
    expect(parseInt(rating || '0')).toBeLessThan(100);
  });

  test('should export violations report', async ({ page }) => {
    const employeeId = await createEmployee(page);

    // Create violations
    await page.goto(`/employees/${employeeId}`);
    await page.click('button:has-text("Add Violation")');
    await page.selectOption('select[name="type"]', 'late_start');
    await page.fill('input[name="severity"]', '5');
    await page.fill('textarea[name="description"]', 'Test violation for export');
    await page.click('button[type="submit"]:has-text("Create Violation")');
    await waitForToast(page, 'Violation created');

    // Go to reports page
    await page.goto('/reports/violations');
    
    // Export report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")')
    ]);

    // Verify download
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/violations.*\.csv$/);
    
    // Optionally verify content
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});








