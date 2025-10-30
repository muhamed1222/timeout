# 🧪 API Integration Tests Guide

## Overview

The API integration tests verify that all endpoints work correctly with real database operations, authentication, and business logic.

## Structure

```
tests/
├── integration/
│   ├── api/
│   │   ├── companies.integration.test.ts
│   │   ├── employees.integration.test.ts
│   │   ├── shifts.integration.test.ts
│   │   ├── rating.integration.test.ts
│   │   └── schedules.integration.test.ts
│   └── helpers/
│       ├── testServer.ts      # Test server setup
│       ├── testDatabase.ts    # Database utilities
│       └── fixtures.ts        # Test data factories
```

---

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Specific Test File
```bash
npm test tests/integration/api/employees.integration.test.ts
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm test -- --watch
```

---

## Test Helpers

### 1. Test Server (`testServer.ts`)

Provides utilities for setting up and managing the test Express server:

```typescript
import { setupTestServer, cleanupTestServer, getRequest } from '../helpers/testServer.js';

// Setup before all tests
beforeAll(async () => {
  app = await setupTestServer();
});

// Cleanup after all tests
afterAll(async () => {
  await cleanupTestServer();
});

// Make requests
const response = await getRequest(app)
  .get('/api/employees')
  .set('Authorization', `Bearer ${token}`);
```

### 2. Test Database (`testDatabase.ts`)

Database management utilities:

```typescript
import { cleanDatabase, setupTestDatabase, cleanupTestDatabase } from '../helpers/testDatabase.js';

// Clean all tables before each test
beforeEach(async () => {
  await cleanDatabase();
});
```

### 3. Fixtures (`fixtures.ts`)

Test data factories:

```typescript
import { 
  createTestCompany, 
  createTestEmployee, 
  createTestShift,
  createTestViolationRule,
  createTestRatingPeriod
} from '../helpers/fixtures.js';

// Create test company with admin
const { company, admin, token } = await createTestCompany({
  name: 'Test Corp',
  adminName: 'Test Admin'
});

// Create test employee
const employee = await createTestEmployee(company.id, {
  full_name: 'John Doe',
  role: 'employee',
  status: 'active'
});

// Create test shift
const shift = await createTestShift(employee.id, {
  status: 'planned',
  planned_start_at: new Date(),
  planned_end_at: new Date(Date.now() + 8 * 60 * 60 * 1000)
});
```

---

## Writing New Tests

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
describe('Employees API', () => {
  describe('GET /api/employees/:id', () => {
    it('should return employee by id', async () => {
      // Arrange: Setup test data
      const employee = await createTestEmployee(companyId, {
        full_name: 'Test Employee'
      });

      // Act: Make the request
      const response = await getRequest(app)
        .get(`/api/employees/${employee.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert: Verify the response
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: employee.id,
        full_name: 'Test Employee'
      });
    });
  });
});
```

### Test Cases to Cover

For each endpoint, test:

1. **Happy Path** - Normal successful operation
2. **Authentication** - Unauthorized access (401)
3. **Authorization** - Wrong company/permissions (403)
4. **Not Found** - Non-existent resources (404)
5. **Validation** - Invalid input data (400)
6. **Business Logic** - Edge cases and constraints

### Example: Complete Endpoint Testing

```typescript
describe('POST /api/employees', () => {
  it('should create new employee with valid data', async () => {
    const newEmployee = {
      company_id: companyId,
      full_name: 'New Employee',
      phone: '+15551234567',
      role: 'employee',
      status: 'active'
    };

    const response = await getRequest(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newEmployee);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      full_name: newEmployee.full_name,
      phone: newEmployee.phone
    });
    expect(response.body).toHaveProperty('id');
  });

  it('should return 401 without authentication', async () => {
    const response = await getRequest(app)
      .post('/api/employees')
      .send({ full_name: 'Test' });

    expect(response.status).toBe(401);
  });

  it('should return 400 with invalid data', async () => {
    const response = await getRequest(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        // Missing required fields
        full_name: 'Test'
      });

    expect(response.status).toBe(400);
  });

  it('should return 400 with invalid phone format', async () => {
    const response = await getRequest(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        company_id: companyId,
        full_name: 'Test',
        phone: 'invalid',
        role: 'employee',
        status: 'active'
      });

    expect(response.status).toBe(400);
  });
});
```

---

## Best Practices

### 1. **Isolation**
- Each test should be independent
- Use `beforeEach` to reset database state
- Don't rely on execution order

```typescript
beforeEach(async () => {
  await cleanDatabase();
  const { token, company } = await createTestCompany();
  authToken = token;
  companyId = company.id;
});
```

### 2. **Descriptive Names**
- Use clear, descriptive test names
- Describe what the test does and what it expects

```typescript
// Good
it('should return 404 when employee does not exist', async () => {});

// Bad
it('test employee endpoint', async () => {});
```

### 3. **Minimal Setup**
- Only create data needed for the specific test
- Use fixtures for common patterns
- Clean up unnecessary data

### 4. **Assertions**
- Use specific matchers
- Test both status codes and response bodies
- Verify side effects (database changes)

```typescript
// Check status
expect(response.status).toBe(200);

// Check response shape
expect(response.body).toMatchObject({
  id: expect.any(String),
  full_name: 'Test'
});

// Verify database change
const getResponse = await getRequest(app)
  .get(`/api/employees/${employee.id}`)
  .set('Authorization', `Bearer ${authToken}`);
expect(getResponse.status).toBe(404);
```

### 5. **Error Cases**
- Test authentication failures
- Test validation errors
- Test business rule violations
- Test not found scenarios

---

## Common Patterns

### Testing CRUD Operations

```typescript
describe('CRUD Operations', () => {
  it('CREATE: should create resource', async () => {
    const response = await getRequest(app)
      .post('/api/resource')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
    
    expect(response.status).toBe(201);
  });

  it('READ: should get resource by id', async () => {
    const resource = await createTestResource();
    
    const response = await getRequest(app)
      .get(`/api/resource/${resource.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });

  it('UPDATE: should update resource', async () => {
    const resource = await createTestResource();
    
    const response = await getRequest(app)
      .put(`/api/resource/${resource.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });
    
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated');
  });

  it('DELETE: should delete resource', async () => {
    const resource = await createTestResource();
    
    const response = await getRequest(app)
      .delete(`/api/resource/${resource.id}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

### Testing Relationships

```typescript
it('should return employee with their shifts', async () => {
  const employee = await createTestEmployee(companyId);
  await createTestShift(employee.id);
  await createTestShift(employee.id);

  const response = await getRequest(app)
    .get(`/api/employees/${employee.id}?include=shifts`)
    .set('Authorization', `Bearer ${authToken}`);

  expect(response.status).toBe(200);
  expect(response.body.shifts).toHaveLength(2);
});
```

### Testing Filters

```typescript
it('should filter by status', async () => {
  await createTestEmployee(companyId, { status: 'active' });
  await createTestEmployee(companyId, { status: 'active' });
  await createTestEmployee(companyId, { status: 'inactive' });

  const response = await getRequest(app)
    .get('/api/employees')
    .query({ status: 'active' })
    .set('Authorization', `Bearer ${authToken}`);

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(2);
  expect(response.body.every(e => e.status === 'active')).toBe(true);
});
```

---

## Troubleshooting

### Database Connection Errors

If you get database connection errors:

```bash
# Check DATABASE_URL is set for tests
echo $DATABASE_URL

# Use test database
export DATABASE_URL="postgresql://user:password@localhost:5432/outtime_test"
```

### Timeout Issues

Increase test timeout for slow operations:

```typescript
it('should complete long operation', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

### Port Conflicts

If the test server fails to start:

```bash
# Check if port is in use
lsof -i :5000

# Kill the process
kill -9 <PID>
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: outtime_test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/outtime_test
```

---

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: 70%+ coverage
- **Critical Paths**: 100% coverage

Check coverage:

```bash
npm run test:coverage
```

View coverage report:

```bash
open coverage/index.html
```

---

## Summary

✅ **5 Test Suites** covering main API endpoints  
✅ **Test Helpers** for easy test writing  
✅ **Best Practices** documented  
✅ **CI/CD Ready**

Happy testing! 🧪




