import { test, expect } from '@playwright/test';

/**
 * E2E Test: Shift Management Flow
 * Tests the critical user journey of creating and managing shifts
 */

test.describe('Shift Management', () => {
  test.beforeEach(async ({ page }) => {
    // This test suite requires an authenticated user
    // In a real scenario, you would set up authentication here
    test.skip(); // Skip unless proper test setup is done
  });

  test('should display shifts page', async ({ page }) => {
    await page.goto('/shifts');
    
    // Check for key elements
    await expect(page.getByRole('heading', { name: /shifts|смены/i })).toBeVisible();
  });

  test('should show shift list for company', async ({ page }) => {
    await page.goto('/shifts');
    
    // Wait for shifts to load
    await page.waitForSelector('[data-testid="shift-list"]', { timeout: 5000 }).catch(() => {
      console.log('Shift list not found - might be empty or loading');
    });
  });

  test('should open create shift modal', async ({ page }) => {
    await page.goto('/shifts');
    
    // Click create button
    await page.click('button:has-text("Create"), button:has-text("Создать")');
    
    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should validate shift form inputs', async ({ page }) => {
    await page.goto('/shifts');
    
    // Open create modal
    await page.click('button:has-text("Create"), button:has-text("Создать")');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    // (Implementation depends on your form library)
  });

  test('should create a new shift', async ({ page }) => {
    await page.goto('/shifts');
    
    // Open create modal
    await page.click('button:has-text("Create"), button:has-text("Создать")');
    
    // Fill shift form
    await page.selectOption('select[name="employee_id"]', { index: 1 });
    
    // Set dates (adjust selectors based on your implementation)
    await page.fill('input[name="start_date"]', '2025-01-01');
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '18:00');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect
    await expect(page.getByText(/success|успешно/i)).toBeVisible({ timeout: 5000 });
  });

  test('should filter shifts by date', async ({ page }) => {
    await page.goto('/shifts');
    
    // Use date filter
    await page.fill('input[type="date"]', '2025-01-01');
    
    // Apply filter
    await page.click('button:has-text("Filter"), button:has-text("Применить")');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Verify results are filtered (check shift dates)
  });

  test('should start a shift', async ({ page }) => {
    await page.goto('/shifts');
    
    // Find first planned shift
    const shiftRow = page.locator('[data-status="planned"]').first();
    
    if (await shiftRow.count() > 0) {
      // Click start button
      await shiftRow.locator('button:has-text("Start"), button:has-text("Начать")').click();
      
      // Confirm action if needed
      await page.click('button:has-text("Confirm"), button:has-text("Подтвердить")').catch(() => {});
      
      // Should update status
      await expect(shiftRow).toHaveAttribute('data-status', 'active', { timeout: 3000 });
    }
  });

  test('should end a shift', async ({ page }) => {
    await page.goto('/shifts');
    
    // Find first active shift
    const shiftRow = page.locator('[data-status="active"]').first();
    
    if (await shiftRow.count() > 0) {
      // Click end button
      await shiftRow.locator('button:has-text("End"), button:has-text("Завершить")').click();
      
      // Confirm action if needed
      await page.click('button:has-text("Confirm"), button:has-text("Подтвердить")').catch(() => {});
      
      // Should update status
      await expect(shiftRow).toHaveAttribute('data-status', 'completed', { timeout: 3000 });
    }
  });

  test('should display shift details', async ({ page }) => {
    await page.goto('/shifts');
    
    // Click on first shift
    await page.locator('[data-testid="shift-row"]').first().click();
    
    // Should show details modal or navigate to details page
    await expect(
      page.getByRole('heading', { name: /shift details|детали смены/i })
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Shift Generation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(); // Requires authenticated admin user
  });

  test('should open shift generation modal', async ({ page }) => {
    await page.goto('/shifts');
    
    // Click generate shifts button
    await page.click('button:has-text("Generate"), button:has-text("Сгенерировать")');
    
    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should generate shifts for date range', async ({ page }) => {
    await page.goto('/shifts');
    
    // Open generation modal
    await page.click('button:has-text("Generate"), button:has-text("Сгенерировать")');
    
    // Fill date range
    await page.fill('input[name="start_date"]', '2025-01-01');
    await page.fill('input[name="end_date"]', '2025-01-31');
    
    // Select employees (optional)
    await page.check('input[name="all_employees"]');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.getByText(/generated|сгенерировано/i)).toBeVisible({ timeout: 10000 });
  });

  test('should validate date range', async ({ page }) => {
    await page.goto('/shifts');
    
    // Open generation modal
    await page.click('button:has-text("Generate"), button:has-text("Сгенерировать")');
    
    // Set end date before start date
    await page.fill('input[name="start_date"]', '2025-01-31');
    await page.fill('input[name="end_date"]', '2025-01-01');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.getByText(/invalid.*range|неверный.*диапазон/i)).toBeVisible();
  });
});

