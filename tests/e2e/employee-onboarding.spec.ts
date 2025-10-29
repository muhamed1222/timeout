/**
 * E2E Test: Employee Onboarding
 * 
 * Tests the employee onboarding workflow:
 * 1. Admin creates invite
 * 2. Generate QR code
 * 3. Employee accepts invite (simulated via Telegram)
 * 4. Employee linked to company
 * 5. Employee starts first shift
 */

import { test, expect } from '@playwright/test';
import {
  register,
  waitForToast,
  waitForWebSocket,
  waitForApiCall,
  TEST_USERS,
} from './helpers';

test.describe('Employee Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Register new company/admin for isolated test
    await register(page);
    await waitForWebSocket(page);
  });

  test('complete employee onboarding flow', async ({ page }) => {
    // Step 1: Navigate to employees page
    await page.goto('/employees');
    await expect(page.locator('h1:has-text("Employees")')).toBeVisible();

    // Step 2: Click "Add Employee" button
    await page.click('button:has-text("Add Employee")');
    
    // Verify modal opened
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Create Invite')).toBeVisible();

    // Step 3: Fill employee information
    const employeeName = 'John Doe';
    const employeePosition = 'Software Engineer';
    
    await page.fill('input[name="full_name"]', employeeName);
    await page.fill('input[name="position"]', employeePosition);
    
    // Step 4: Create invite
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    // Wait for invite creation
    await waitForToast(page, 'Invite created');

    // Step 5: Verify QR code is displayed
    await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible({ timeout: 5000 });
    
    // Step 6: Verify invite code is displayed
    const inviteCodeElement = page.locator('[data-testid="input-invite-code"]');
    await expect(inviteCodeElement).toBeVisible();
    
    const inviteCode = await inviteCodeElement.inputValue();
    expect(inviteCode).toBeTruthy();
    expect(inviteCode.length).toBeGreaterThan(0);

    // Step 7: Verify deep link is displayed
    const deepLinkElement = page.locator('[data-testid="input-deep-link"]');
    await expect(deepLinkElement).toBeVisible();
    
    const deepLink = await deepLinkElement.inputValue();
    expect(deepLink).toContain('t.me');
    expect(deepLink).toContain(inviteCode);

    // Step 8: Copy invite code
    await page.click('[data-testid="button-copy-code"]');
    await waitForToast(page, 'Copied');

    // Step 9: Close QR dialog
    await page.click('button:has-text("Close")');
    
    // Verify dialog closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Step 10: Verify invite appears in active invites list
    await expect(page.locator('text=Active Invitations')).toBeVisible();
    await expect(page.locator(`text=${employeeName}`)).toBeVisible();
    await expect(page.locator(`code:has-text("${inviteCode}")`)).toBeVisible();

    // Step 11: Simulate employee accepting invite via Telegram
    // (In real scenario, this would be done by Telegram bot)
    // For testing, we'll call the API directly
    const telegramUserId = '123456789';
    const acceptResponse = await page.request.post('/api/employee-invites/use', {
      data: {
        code: inviteCode,
        telegram_user_id: telegramUserId,
        telegram_username: 'johndoe',
      },
    });
    
    expect(acceptResponse.ok()).toBeTruthy();
    const acceptData = await acceptResponse.json();
    const employeeId = acceptData.employee_id;
    expect(employeeId).toBeTruthy();

    // Step 12: Wait for page to update (auto-refresh)
    await page.waitForTimeout(6000); // Wait for refetch interval

    // Step 13: Verify employee appears in employees list
    await page.reload();
    await expect(page.locator(`[data-testid="employee-card-${employeeId}"]`)).toBeVisible({ timeout: 10000 });

    // Step 14: Verify invite is no longer in active list
    // (Should be marked as used)
    const activeInvitesSection = page.locator('text=Active Invitations');
    const inviteAfterUse = page.locator(`code:has-text("${inviteCode}")`);
    
    // Invite should either be gone or marked as used
    const inviteCount = await inviteAfterUse.count();
    if (inviteCount > 0) {
      // If still visible, should be in a "used" section
      await expect(page.locator('text=Used')).toBeVisible();
    }

    // Step 15: Click on employee card to view details
    await page.click(`[data-testid="employee-card-${employeeId}"]`);
    
    // Verify employee details
    await expect(page.locator(`text=${employeeName}`)).toBeVisible();
    await expect(page.locator(`text=${employeePosition}`)).toBeVisible();
    await expect(page.locator(`text=${telegramUserId}`)).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible(); // Status badge

    // Step 16: Create first shift for new employee
    await page.goto(`/employees/${employeeId}/shifts`);
    await page.click('button:has-text("Create Shift")');
    
    const now = new Date();
    const startAt = `${now.toISOString().split('T')[0]}T${now.getHours().toString().padStart(2, '0')}:00`;
    const endAt = `${now.toISOString().split('T')[0]}T${(now.getHours() + 8).toString().padStart(2, '0')}:00`;
    
    await page.fill('input[name="planned_start_at"]', startAt);
    await page.fill('input[name="planned_end_at"]', endAt);
    await page.click('button[type="submit"]');
    
    await waitForToast(page, 'Shift created');

    // Step 17: Verify shift created
    const shiftCard = page.locator('[data-testid^="shift-card-"]').first();
    await expect(shiftCard).toBeVisible();
    await expect(shiftCard).toContainText(employeeName);
  });

  test('should generate unique invite codes', async ({ page }) => {
    await page.goto('/employees');

    const inviteCodes: string[] = [];
    const numberOfInvites = 3;

    // Create multiple invites
    for (let i = 0; i < numberOfInvites; i++) {
      await page.click('button:has-text("Add Employee")');
      
      await page.fill('input[name="full_name"]', `Employee ${i + 1}`);
      await page.fill('input[name="position"]', 'Tester');
      
      await page.click('button[type="submit"]:has-text("Create Invite")');
      await waitForToast(page, 'Invite created');

      // Get invite code
      const codeElement = page.locator('[data-testid="input-invite-code"]');
      const code = await codeElement.inputValue();
      inviteCodes.push(code);
      
      // Close dialog
      await page.click('button:has-text("Close")');
      await page.waitForTimeout(500);
    }

    // Verify all codes are unique
    const uniqueCodes = new Set(inviteCodes);
    expect(uniqueCodes.size).toBe(numberOfInvites);
  });

  test('should not allow using expired/invalid invite', async ({ page }) => {
    // Try to use invalid invite code
    const invalidCode = 'INVALID_CODE_123';
    
    const response = await page.request.post('/api/employee-invites/use', {
      data: {
        code: invalidCode,
        telegram_user_id: '999999',
        telegram_username: 'testuser',
      },
    });
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('not found');
  });

  test('should not allow using same invite twice', async ({ page }) => {
    await page.goto('/employees');
    
    // Create invite
    await page.click('button:has-text("Add Employee")');
    await page.fill('input[name="full_name"]', 'Test Employee');
    await page.fill('input[name="position"]', 'Tester');
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    await waitForToast(page, 'Invite created');
    
    const codeElement = page.locator('[data-testid="input-invite-code"]');
    const inviteCode = await codeElement.inputValue();
    
    await page.click('button:has-text("Close")');

    // Use invite first time
    const firstUse = await page.request.post('/api/employee-invites/use', {
      data: {
        code: inviteCode,
        telegram_user_id: '111111',
        telegram_username: 'user1',
      },
    });
    
    expect(firstUse.ok()).toBeTruthy();

    // Try to use same invite again
    const secondUse = await page.request.post('/api/employee-invites/use', {
      data: {
        code: inviteCode,
        telegram_user_id: '222222',
        telegram_username: 'user2',
      },
    });
    
    expect(secondUse.status()).toBe(400);
    const data = await secondUse.json();
    expect(data.error).toContain('already used');
  });

  test('should show QR code in invite list', async ({ page }) => {
    await page.goto('/employees');
    
    // Create invite
    await page.click('button:has-text("Add Employee")');
    await page.fill('input[name="full_name"]', 'QR Test Employee');
    await page.fill('input[name="position"]', 'Developer');
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    await waitForToast(page, 'Invite created');
    await page.click('button:has-text("Close")');

    // Find invite in list
    const inviteCard = page.locator('text=QR Test Employee').locator('..').locator('..');
    await expect(inviteCard).toBeVisible();
    
    // Click "Show QR Code" button
    await inviteCard.locator('button:has-text("Show QR")').click();
    
    // Verify QR dialog opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
  });

  test('should delete unused invite', async ({ page }) => {
    await page.goto('/employees');
    
    // Create invite
    await page.click('button:has-text("Add Employee")');
    await page.fill('input[name="full_name"]', 'Delete Test');
    await page.fill('input[name="position"]', 'Temp');
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    await waitForToast(page, 'Invite created');
    
    const codeElement = page.locator('[data-testid="input-invite-code"]');
    const inviteCode = await codeElement.inputValue();
    
    await page.click('button:has-text("Close")');

    // Find delete button for this invite
    const inviteCard = page.locator(`code:has-text("${inviteCode}")`).locator('..').locator('..');
    const deleteButton = inviteCard.locator('[data-testid^="button-delete-invite-"]');
    
    await deleteButton.click();
    
    // Wait for deletion
    await waitForToast(page, 'Invite deleted');
    
    // Verify invite removed from list
    await expect(page.locator(`code:has-text("${inviteCode}")`)).not.toBeVisible();
  });

  test('should show onboarding instructions', async ({ page }) => {
    await page.goto('/employees');
    
    // Create invite
    await page.click('button:has-text("Add Employee")');
    await page.fill('input[name="full_name"]', 'Instructions Test');
    await page.fill('input[name="position"]', 'New Hire');
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    await waitForToast(page, 'Invite created');

    // Verify instructions are displayed
    await expect(page.locator('text=Instructions for employee:')).toBeVisible();
    await expect(page.locator('text=Scan QR code')).toBeVisible();
    await expect(page.locator('text=Telegram')).toBeVisible();
    await expect(page.locator('text=automatically connected')).toBeVisible();
  });

  test('employee list updates in real-time after onboarding', async ({ page, context }) => {
    await page.goto('/employees');

    // Open employees page in second tab
    const employeesPage = await context.newPage();
    await employeesPage.goto('/employees');
    
    // Count initial employees
    const initialCount = await employeesPage.locator('[data-testid^="employee-card-"]').count();

    // Create invite in first tab
    await page.click('button:has-text("Add Employee")');
    await page.fill('input[name="full_name"]', 'Real-time Test');
    await page.fill('input[name="position"]', 'Developer');
    await page.click('button[type="submit"]:has-text("Create Invite")');
    
    await waitForToast(page, 'Invite created');
    
    const codeElement = page.locator('[data-testid="input-invite-code"]');
    const inviteCode = await codeElement.inputValue();
    await page.click('button:has-text("Close")');

    // Use invite (simulate Telegram acceptance)
    await page.request.post('/api/employee-invites/use', {
      data: {
        code: inviteCode,
        telegram_user_id: '777777',
        telegram_username: 'realtimetest',
      },
    });

    // Second tab should update automatically (wait for refetch)
    await employeesPage.waitForTimeout(6000);
    
    // Verify new employee appears in second tab
    const newCount = await employeesPage.locator('[data-testid^="employee-card-"]').count();
    expect(newCount).toBe(initialCount + 1);
    
    await expect(employeesPage.locator('text=Real-time Test')).toBeVisible();

    await employeesPage.close();
  });
});

