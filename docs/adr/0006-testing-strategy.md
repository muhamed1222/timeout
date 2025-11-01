# 6. Testing Strategy with Vitest

Date: 2025-10-30

## Status

Accepted

## Context

We need a comprehensive testing strategy to ensure:
- Code quality and correctness
- Confidence when refactoring
- Prevention of regressions
- Documentation through tests
- Fast feedback during development

The application has three main layers:
1. **Frontend** (React components and hooks)
2. **Backend** (API endpoints and services)
3. **Database** (Data access and integrity)

We need tests at multiple levels:
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints with database
- **E2E Tests**: Full user flows (future)

### Options Considered

1. **Jest + React Testing Library**
   - Most popular
   - Slower startup
   - Complex configuration with ESM

2. **Vitest + React Testing Library**
   - Vite-native (instant startup)
   - Jest-compatible API
   - Better ESM support
   - Faster execution

3. **Mocha + Chai**
   - Flexible but manual setup
   - Less React-specific tooling

## Decision

We will use **Vitest** as our test runner with:
- **React Testing Library** for component tests
- **Supertest** for API integration tests
- **MSW (Mock Service Worker)** for API mocking in frontend tests
- **Target: 80% test coverage** overall

### Why Vitest?

- **Fast**: Instant startup with Vite, parallel execution
- **Jest-Compatible**: Easy migration, familiar API
- **TypeScript**: First-class TypeScript support
- **ESM Support**: Native ESM, no configuration headaches
- **UI**: Built-in UI for debugging tests
- **Coverage**: Built-in coverage with c8

## Consequences

### Positive

- **Fast Feedback**: Tests run in milliseconds
- **Developer Experience**: Watch mode, UI, filtering
- **Type Safety**: Full TypeScript support in tests
- **Familiarity**: Jest-compatible API
- **Modern**: Built for modern JavaScript
- **Coverage**: Built-in coverage reports

### Negative

- **Less Mature**: Newer than Jest
- **Smaller Ecosystem**: Fewer plugins/extensions
- **Learning Curve**: Team needs to learn new tool

### Mitigation

- Document testing patterns and examples
- Provide test templates for common scenarios
- Regular code reviews for test quality
- CI/CD integration for automatic testing

## Testing Layers

### 1. Unit Tests

**What to Test:**
- Business logic functions
- Utility functions
- Data transformations
- Calculations

**Example:**
```typescript
// server/services/__tests__/RatingService.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRating } from '../RatingService';

describe('RatingService', () => {
  it('should calculate rating correctly', () => {
    const violations = [
      { penalty_percent: 5 },
      { penalty_percent: 3 },
    ];

    const rating = calculateRating(violations);

    expect(rating).toBe(92); // 100 - 5 - 3
  });
});
```

### 2. Component Tests

**What to Test:**
- User interactions
- Conditional rendering
- Props handling
- Event handlers

**Example:**
```typescript
// client/src/components/__tests__/EmployeeCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeCard } from '../EmployeeCard';

describe('EmployeeCard', () => {
  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    const employee = { id: '1', full_name: 'John Doe' };

    render(<EmployeeCard employee={employee} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### 3. Integration Tests

**What to Test:**
- API endpoints
- Database operations
- Authentication
- Error handling

**Example:**
```typescript
// tests/integration/api/employees.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestServer, getRequest } from '../helpers/testServer';
import { createTestCompany } from '../helpers/fixtures';

describe('Employees API', () => {
  let app;
  let token;

  beforeEach(async () => {
    app = await setupTestServer();
    const { token: authToken } = await createTestCompany();
    token = authToken;
  });

  it('should create employee', async () => {
    const response = await getRequest(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        full_name: 'John Doe',
        phone: '+1234567890',
        role: 'employee',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Coverage Goals

### Minimum Coverage
- **Overall**: 80%
- **Critical Paths**: 100%
- **New Features**: Must have tests

### Measured Coverage
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Exclusions
- Generated files
- Type definitions
- Configuration files
- Migration scripts

## Test Organization

```
tests/
├── unit/                    # Unit tests
│   ├── services/
│   ├── utils/
│   └── lib/
├── integration/             # Integration tests
│   ├── api/
│   │   ├── employees.integration.test.ts
│   │   ├── shifts.integration.test.ts
│   │   └── rating.integration.test.ts
│   └── helpers/
│       ├── testServer.ts
│       ├── testDatabase.ts
│       └── fixtures.ts
└── e2e/                    # E2E tests (future)
    └── user-flows/
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate correctly', () => {
  // Arrange
  const input = [1, 2, 3];

  // Act
  const result = sum(input);

  // Assert
  expect(result).toBe(6);
});
```

### 2. Descriptive Test Names

```typescript
// ✅ Good
it('should return 404 when employee does not exist', () => {});

// ❌ Bad
it('test employee', () => {});
```

### 3. Mock External Dependencies

```typescript
vi.mock('./api', () => ({
  fetchEmployee: vi.fn().mockResolvedValue(mockEmployee),
}));
```

### 4. Clean Up After Tests

```typescript
beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanupTestServer();
});
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      
      # Upload coverage to Codecov
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test employees.test.ts

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/index.html

# Run tests with UI
npm run test:ui
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [API_TESTS_GUIDE.md](../../API_TESTS_GUIDE.md)





