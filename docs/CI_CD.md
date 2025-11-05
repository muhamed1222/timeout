# 🚀 CI/CD Pipeline Documentation

Complete guide to Continuous Integration and Continuous Deployment setup for ShiftManager.

---

## 📋 Overview

The project uses **GitHub Actions** for CI/CD with multiple workflow files:

- **`ci-comprehensive.yml`** - Main comprehensive CI pipeline
- **`test.yml`** - Standalone test workflow
- **`ci.yml`** - Legacy CI workflow (maintained for compatibility)
- **`deploy.yml`** - Production deployment workflow
- **`pr-checks.yml`** - Quick checks for pull requests
- **`nightly.yml`** - Nightly full test suite

---

## 🔄 Workflow Overview

### Main CI Pipeline (`ci-comprehensive.yml`)

**Triggers:**

- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs:**

1. **Lint & Format Check** ✅
   - ESLint validation
   - Prettier format checking

2. **TypeScript Type Check** ✅
   - Full type checking across codebase

3. **Code Quality Check** ✅
   - Combined lint, format, and type check

4. **Unit Tests** ✅
   - Runs all unit tests
   - Generates coverage report
   - Uploads to Codecov
   - Checks coverage thresholds (80%+)

5. **Integration Tests** ✅
   - Runs integration tests with PostgreSQL
   - Tests API endpoints
   - Requires test database

6. **E2E Tests** ✅
   - Playwright browser tests
   - Full application workflow tests
   - Generates reports and traces

7. **Build Application** ✅
   - Vercel build verification
   - Artifact verification

8. **Security Audit** ✅
   - npm audit for vulnerabilities
   - Blocks critical/high severity issues

9. **Test Summary** ✅
   - Aggregates all test results
   - Creates summary report

---

## 🧪 Test Stages

### Unit Tests

```bash
npm run test:unit
```

- **Location:** `server/**/*.test.ts`, `client/src/**/*.test.tsx`
- **Coverage:** 80%+ required (lines, functions, statements, 75% branches)
- **Duration:** ~2-5 minutes
- **Artifacts:** Coverage reports (lcov, HTML, JSON)

### Integration Tests

```bash
npm run test:integration
```

- **Location:** `tests/integration/api/**/*.integration.test.ts`
- **Database:** PostgreSQL 15 (GitHub Actions service)
- **Coverage:** API endpoints, database operations
- **Duration:** ~5-10 minutes
- **Requirements:** Test database setup

### E2E Tests

```bash
npm run test:e2e
```

- **Location:** `tests/e2e/**/*.spec.ts`
- **Browser:** Chromium (Playwright)
- **Coverage:** Critical user flows
- **Duration:** ~10-15 minutes
- **Artifacts:** Playwright reports, traces, screenshots

---

## 🔧 Local Testing

### Run All Tests Locally

```bash
# Install dependencies
npm ci

# Run all tests
npm run test:all

# Individual test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm run test:coverage
```

### Test Database Setup

For integration tests, you need a PostgreSQL database:

```bash
# Using Docker
docker run -d \
  --name test-postgres \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test \
  -p 5432:5432 \
  postgres:15

# Set environment variable
export DATABASE_URL=postgresql://test:test@localhost:5432/test

# Run migrations
npm run db:push

# Run integration tests
npm run test:integration
```

---

## 📊 Coverage Reports

### View Coverage

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 75%
- **Statements:** 80%

### Codecov Integration

Coverage reports are automatically uploaded to Codecov:

1. Sign up at [codecov.io](https://codecov.io)
2. Add repository
3. Get `CODECOV_TOKEN`
4. Add to GitHub Secrets
5. Reports will be uploaded automatically

---

## 🚀 Deployment Workflow

### Automatic Deployment

**Triggers:**

- Push to `main` branch
- Manual dispatch

**Steps:**

1. **Run Comprehensive Tests** ✅
   - All test stages must pass
   - Security audit must pass

2. **Deploy to Vercel** ✅
   - Production deployment
   - Environment variables from secrets

3. **Build Docker Image** ✅
   - Multi-platform build (amd64, arm64)
   - Push to Docker Hub

4. **Run Database Migrations** ✅
   - Apply pending migrations
   - Production database

5. **Post-Deployment Health Checks** ✅
   - `/api/health` check
   - `/api/health/ready` check
   - API smoke tests

6. **Deployment Notification** ✅
   - Success/failure notification
   - Deployment summary

---

## 🔐 Secrets & Environment Variables

### Required GitHub Secrets

#### For CI/CD:

- `CODECOV_TOKEN` - Codecov upload token (optional)
- `TEST_SUPABASE_URL` - Test Supabase URL (for E2E tests)
- `TEST_SUPABASE_ANON_KEY` - Test Supabase anon key
- `TEST_SUPABASE_SERVICE_ROLE_KEY` - Test Supabase service role key

#### For Deployment:

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `PRODUCTION_DATABASE_URL` - Production database URL
- `APP_URL` - Production app URL
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `VPS_HOST` - VPS hostname (optional)
- `VPS_USERNAME` - VPS username (optional)
- `VPS_SSH_KEY` - VPS SSH private key (optional)

### Adding Secrets

1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add name and value
5. Save

---

## 🐛 Troubleshooting

### Tests Fail in CI but Pass Locally

1. **Check environment variables:**

   ```bash
   # CI sets NODE_ENV=test
   # Make sure test setup handles this
   ```

2. **Database timing:**

   ```bash
   # CI services may need more time to start
   # Check health checks in workflow
   ```

3. **Cache issues:**
   ```bash
   # Clear npm cache in CI
   # Use npm ci instead of npm install
   ```

### Coverage Threshold Not Met

1. **Check coverage report:**

   ```bash
   npm run test:coverage
   open coverage/index.html
   ```

2. **Identify uncovered code:**
   - Look for red lines in coverage report
   - Add tests for uncovered code paths

3. **Temporarily lower threshold** (for migration period):
   ```typescript
   // In vitest.config.ts
   thresholds: {
     lines: 70, // Lower from 80
     // ...
   }
   ```

### E2E Tests Timeout

1. **Increase timeout:**

   ```typescript
   // In playwright.config.ts
   timeout: 60_000; // Increase from 30s
   ```

2. **Check server startup:**

   ```bash
   # Ensure test server starts before tests
   # Check wait time in workflow
   ```

3. **Verify database:**
   ```bash
   # Ensure test database is ready
   # Check health check in workflow
   ```

---

## 📈 Best Practices

### 1. Test Before Pushing

Always run tests locally before pushing:

```bash
npm run quality  # Lint, format, type check
npm run test:unit
```

### 2. Keep Tests Fast

- Unit tests should be < 5 minutes
- Integration tests should be < 10 minutes
- E2E tests should be < 15 minutes

### 3. Test Coverage

- Aim for 80%+ coverage
- Focus on critical paths
- Don't sacrifice quality for coverage

### 4. Fail Fast

- Lint and type check first
- Run unit tests before integration
- Run integration before E2E

### 5. Parallel Execution

- Tests run in parallel when possible
- Use matrix strategy for multiple Node versions
- Cache dependencies to speed up

---

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Codecov Documentation](https://docs.codecov.com/)

---

**Last Updated:** January 2025  
**Status:** ✅ Fully Configured
