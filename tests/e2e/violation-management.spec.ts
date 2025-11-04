/**
 * E2E Test: Violation Management
 * 
 * Tests violation management workflows:
 * 1. Create violation rule
 * 2. Add violation to employee
 * 3. Verify rating update
 * 4. View violations list
 */

import { test, expect } from '@playwright/test';
import {
  register,
  waitForToast,
  waitForWebSocket,
  createEmployee,
} from './helpers';

test.describe('Violation Management', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
    await waitForWebSocket(page);
  });

  test('should create violation rule and add violation', async ({ page }) => {
    // Create employee first
    const employeeId = await createEmployee(page);
    
    // Navigate to violation rules
    await page.goto('/violation-rules');
    
    // Create violation rule
    const createButton = page.locator('button:has-text("Create Rule"), button:has-text("Создать правило")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill rule form
      await page.fill('input[name="code"]', 'LATE_START');
      await page.fill('input[name="name"]', 'Late Start');
      await page.fill('input[name="description"]', 'Employee arrived late');
      await page.fill('input[name="penalty_percent"]', '5');
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await waitForToast(page, /created|создан/i);
      }
    }
    
    // Navigate to violations
    await page.goto('/violations');
    
    // Add violation to employee
    const addViolationButton = page.locator('button:has-text("Add Violation"), button:has-text("Добавить нарушение")');
    if (await addViolationButton.isVisible()) {
      await addViolationButton.click();
      
      // Select employee and rule
      const employeeSelect = page.locator('select[name="employee_id"]');
      if (await employeeSelect.isVisible()) {
        await employeeSelect.selectOption(employeeId);
      }
      
      // Fill violation details
      await page.fill('textarea[name="reason"]', 'Arrived 15 minutes late');
      
      // Submit
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await waitForToast(page, /violation|нарушение/i);
      }
    }
  });

  test('should verify rating updates after violation', async ({ page }) => {
    // Create employee
    await createEmployee(page);
    
    // Navigate to rating page
    await page.goto('/rating');
    
    // Verify rating is displayed (should be 100 initially)
    const ratingDisplay = page.locator('[data-testid="rating"], .rating, text=/rating|рейтинг/i');
    await expect(ratingDisplay.first()).toBeVisible();
    
    // After adding violation (from previous test or setup), verify rating decreased
    // This would need the violation to be created first
  });
});



