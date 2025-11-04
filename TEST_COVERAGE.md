# Test Coverage Configuration

This document describes the test coverage setup and goals for the project.

## Coverage Goals

- **Overall Coverage:** 80%+
- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 75%
- **Statements:** 80%

## Running Coverage Reports

### Generate Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage by Component

```bash
# Coverage for specific files
npm run test:coverage -- --include="server/services/**"

# Coverage for client components
npm run test:coverage -- --include="client/src/**"
```

## Coverage Configuration

Coverage is configured in `vitest.config.ts`:

- **Provider:** v8 (fastest)
- **Reporters:** text, json, html, lcov
- **Thresholds:** Enforced minimums for each metric

## Excluded Files

The following files are excluded from coverage:

- Test files (`**/*.test.ts`, `**/*.spec.ts`)
- Configuration files (`**/*.config.ts`)
- Type definitions (`**/*.d.ts`)
- E2E tests (`tests/e2e/**`)
- Entry points (`client/src/main.tsx`, `server/index.ts`)
- Build artifacts (`dist/**`, `node_modules/**`)

## CI/CD Integration

Coverage reports are generated in CI/CD pipelines and uploaded to:

- **Codecov** (if configured)
- **Coveralls** (if configured)
- **GitHub Actions Artifacts**

## Improving Coverage

To improve test coverage:

1. **Identify gaps:** Run `npm run test:coverage` and check HTML report
2. **Add unit tests:** Focus on uncovered functions and branches
3. **Add integration tests:** Test API endpoints and workflows
4. **Add E2E tests:** Test critical user flows

## Coverage Reports Location

- **HTML Report:** `coverage/index.html`
- **JSON Report:** `coverage/coverage-final.json`
- **LCOV Report:** `coverage/lcov.info`

## Threshold Enforcement

Coverage thresholds are enforced in `vitest.config.ts`. If thresholds are not met:

1. Tests will fail
2. Build will fail (in CI/CD)
3. Coverage report will highlight missing coverage

## Best Practices

1. **Aim for high branch coverage:** Test both success and error paths
2. **Test edge cases:** Null values, empty arrays, boundary conditions
3. **Mock external dependencies:** Focus on your code, not third-party libraries
4. **Keep tests maintainable:** Use descriptive test names and organize by feature

## Coverage Badge

Add a coverage badge to README.md (if using Codecov/Coveralls):

```markdown
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```



