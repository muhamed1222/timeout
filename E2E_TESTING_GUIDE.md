# 🧪 E2E Testing Guide

## Overview

End-to-end (E2E) tests verify the entire application flow from the user's perspective using Playwright.

**Coverage:**
- ✅ Shift lifecycle (create → start → break → end)
- ✅ Rating system (violations → rating updates → exceptions)
- ✅ Employee onboarding
- ✅ Real-time WebSocket updates
- ✅ Cross-browser testing (Chrome, Firefox, Safari)

---

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
npx playwright install
```

### Run E2E Tests

```bash
# Run all tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test shift-lifecycle

# Run specific browser
npx playwright test --project=chromium
```

---

## 📁 Test Structure

```
tests/e2e/
├── helpers.ts                    # Shared utilities
├── shift-lifecycle.spec.ts       # Shift workflow tests
├── rating-system.spec.ts         # Rating & violations tests
└── employee-onboarding.spec.ts   # Onboarding flow tests
```

---

## 📝 Test Files

### 1. Shift Lifecycle (`shift-lifecycle.spec.ts`)

**Tests:**
- ✅ Complete shift workflow (create → start → pause → resume → end)
- ✅ Prevent starting non-scheduled shifts
- ✅ Track break time accurately
- ✅ Real-time WebSocket updates
- ✅ Shift cancellation

**Example:**
```typescript
test('complete shift lifecycle flow', async ({ page }) => {
  await register(page);
  const employeeId = await createEmployee(page);
  const shiftId = await createShift(page, employeeId);
  
  // Start shift
  await page.click('button:has-text("Start Shift")');
  await waitForToast(page, 'Shift started');
  
  // Take break
  await page.click('button:has-text("Take Break")');
  await waitForToast(page, 'Break started');
  
  // Resume
  await page.click('button:has-text("End Break")');
  
  // End shift
  await page.click('button:has-text("End Shift")');
  await waitForToast(page, 'Shift ended');
});
```

---

### 2. Rating System (`rating-system.spec.ts`)

**Tests:**
- ✅ Rating updates after violation
- ✅ Exception creation and resolution
- ✅ Rating restoration after exception approval
- ✅ Rating history tracking
- ✅ Automatic violation detection
- ✅ Violation filtering
- ✅ Company leaderboard
- ✅ Export violations report

**Example:**
```typescript
test('should update rating after violation', async ({ page }) => {
  const employeeId = await createEmployee(page);
  
  // Create violation
  await page.click('button:has-text("Add Violation")');
  await page.selectOption('select[name="type"]', 'late_start');
  await page.fill('input[name="severity"]', '5');
  await page.fill('textarea[name="description"]', 'Late arrival');
  await page.click('button[type="submit"]');
  
  // Verify rating decreased
  await page.reload();
  const rating = await page.locator('[data-testid="employee-rating"]').textContent();
  expect(parseInt(rating)).toBeLessThan(100);
});
```

---

## 🛠️ Helper Functions

### Authentication

```typescript
import { register, login } from './helpers';

// Register new user
await register(page);

// Login existing user
await login(page, 'user@test.com', 'password123');
```

### Employee Management

```typescript
import { createEmployee } from './helpers';

// Create employee via UI
const employeeId = await createEmployee(page, {
  full_name: 'John Doe',
  position: 'Engineer',
});
```

### Shift Management

```typescript
import { createShift } from './helpers';

// Create shift
const shiftId = await createShift(page, employeeId, {
  startAt: '2025-10-30T09:00',
  endAt: '2025-10-30T17:00',
});
```

### Notifications

```typescript
import { waitForToast } from './helpers';

// Wait for success message
await waitForToast(page, 'Shift created');
```

### WebSocket

```typescript
import { waitForWebSocket } from './helpers';

// Wait for WebSocket connection
await waitForWebSocket(page);
```

---

## 📊 Test Configuration

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'Mobile Chrome', use: devices['Pixel 5'] },
    { name: 'Mobile Safari', use: devices['iPhone 12'] },
  ],
});
```

---

## 🎯 Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  // Register new user for isolated test
  await register(page);
});
```

### 2. Use Data Attributes

```html
<!-- In components -->
<div data-testid="employee-rating">{rating}</div>
<div data-shift-id={shiftId}>...</div>
```

```typescript
// In tests
await page.locator('[data-testid="employee-rating"]');
await page.locator(`[data-shift-id="${shiftId}"]`);
```

### 3. Wait for Async Operations

```typescript
// ❌ BAD: No waiting
await page.click('button');
expect(page.locator('text=Success')).toBeVisible();

// ✅ GOOD: Wait for toast
await page.click('button');
await waitForToast(page, 'Success');
```

### 4. Handle Flaky Tests

```typescript
// Increase timeout for slow operations
await expect(page.locator('text=Result')).toBeVisible({
  timeout: 10000 // 10 seconds
});

// Use retry logic
test.describe(() => {
  test.use({ retries: 2 });
  
  test('potentially flaky test', async ({ page }) => {
    // ...
  });
});
```

### 5. Clean Up

```typescript
test.afterEach(async ({ page }) => {
  // Close any open dialogs
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach(el => el.remove());
  });
});
```

---

## 🐛 Debugging

### Run in Debug Mode

```bash
# Open Playwright Inspector
npx playwright test --debug

# Run specific test in debug mode
npx playwright test shift-lifecycle --debug

# Open UI mode
npm run test:e2e:ui
```

### View Test Reports

```bash
# Generate HTML report
npx playwright show-report

# Open report in browser
```

### Screenshots & Videos

Playwright automatically captures:
- Screenshots on failure
- Videos on failure (if configured)
- Traces on retry

```bash
# View trace
npx playwright show-trace trace.zip
```

---

## 🚀 CI/CD Integration

### GitHub Actions

Already configured in `.github/workflows/test.yml`:

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      # ...
  
  steps:
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
```

**Runs on:**
- Every push to `main` or `develop`
- Every pull request

---

## 📈 Coverage

### Current E2E Coverage

| Flow | Tests | Status |
|------|-------|--------|
| Shift lifecycle | 5 | ✅ |
| Rating system | 8 | ✅ |
| Employee onboarding | 3 | ✅ |
| **Total** | **16** | ✅ |

### Test Scenarios

**Shift Management:**
- Create shift
- Start shift
- Pause/resume (breaks)
- End shift
- Cancel shift
- Real-time updates

**Rating System:**
- Create violation
- Auto-detect violation
- Update rating
- Create exception
- Resolve exception
- View rating history
- Leaderboard
- Export reports

---

## 🎓 Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test';
import { register, waitForToast } from './helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/feature');
    
    // Act
    await page.click('button:has-text("Action")');
    
    // Assert
    await expect(page.locator('text=Expected Result')).toBeVisible();
  });

  test('should handle errors', async ({ page }) => {
    // Test error scenarios
  });
});
```

### Tips

1. **Use descriptive test names:**
   ```typescript
   test('should prevent starting shift before scheduled time');
   ```

2. **Group related tests:**
   ```typescript
   test.describe('Shift Cancellation', () => {
     test('should cancel scheduled shift');
     test('should not cancel active shift');
   });
   ```

3. **Use fixtures for setup:**
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Common setup
   });
   ```

4. **Test both success and error paths**

5. **Test responsive design:**
   ```typescript
   test.use({ viewport: { width: 375, height: 667 } }); // Mobile
   ```

---

## ✅ Checklist

Before committing new E2E tests:

- [ ] Tests run successfully locally
- [ ] Tests are isolated (no dependencies on other tests)
- [ ] Used data attributes for selectors
- [ ] Added proper waits for async operations
- [ ] Handled loading states
- [ ] Tested error scenarios
- [ ] Added descriptive test names
- [ ] Cleaned up after tests

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)

---

**Last Updated:** 2025-10-29  
**Version:** 1.0  
**Status:** ✅ Production-ready




