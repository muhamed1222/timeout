# 🧪 Testing Guide

This project includes both unit tests and E2E tests to ensure code quality and reliability.

## Test Structure

```
├── server/__tests__/       # Unit tests for server code
│   ├── lib/                # Library tests (cache, logger, etc.)
│   └── services/           # Service layer tests
└── tests/                  # E2E tests with Playwright
    ├── auth.spec.ts        # Authentication flow
    ├── shifts.spec.ts      # Shift management
    └── rating.spec.ts      # Rating system (existing)
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run unit tests in watch mode
npm run test:unit:watch

# Run tests with coverage report
npm run test:coverage

# Open Vitest UI
npm run test:unit:ui
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Start');
  await expect(page).toHaveURL('/dashboard');
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for:
  - Services (business logic)
  - Libraries (cache, logger, validators)
  - Utilities

- **E2E Tests**: Cover critical user journeys:
  - ✅ Registration and login
  - ✅ Shift creation and management
  - ✅ Rating system
  - Employee management
  - Telegram integration

## CI/CD Integration

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests

See `.github/workflows/ci.yml` for configuration.

## Debugging Tests

### Vitest

```bash
# Run tests with debug logging
DEBUG=* npm test

# Run specific test file
npm test server/__tests__/lib/cache.test.ts
```

### Playwright

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Best Practices

1. **Keep tests independent** - Each test should be able to run in isolation
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Mock external dependencies** - Don't make real API calls or DB queries in unit tests
4. **Test behavior, not implementation** - Focus on what the code does, not how
5. **Keep tests fast** - Unit tests should run in milliseconds

## Troubleshooting

### Unit Tests Fail

- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run check`
- Clear cache: `npx vitest run --no-cache`

### E2E Tests Fail

- Ensure development server is running: `npm run dev`
- Install Playwright browsers: `npx playwright install`
- Check test environment variables in `.env.test`

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

