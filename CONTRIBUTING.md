# Contributing to outTime

Thank you for your interest in contributing to outTime! 🎉

We welcome contributions of all kinds: bug fixes, features, documentation improvements, and more.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Questions?](#questions)

---

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/timeout.git
   cd timeout
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes**
   ```bash
   # Code, test, commit
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template
   - Submit!

---

## 💻 Development Setup

### Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** 14+
- **Git**

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Edit .env with your configuration
nano .env

# 4. Run database migrations
npm run db:push

# 5. Start development server
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Development Commands

```bash
# Start dev server (frontend + backend)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Check TypeScript types
npm run check

# Lint code
npm run lint

# Format code
npm run format

# Run integration tests
npm run test:integration

# Check test coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
timeout/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── main.tsx       # Entry point
│   └── ...
│
├── server/                # Express backend
│   ├── handlers/          # Route handlers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── middleware/        # Express middleware
│   ├── lib/               # Utilities
│   ├── telegram/          # Telegram bot
│   └── index.ts           # Entry point
│
├── shared/                # Shared code (types, schemas)
│   └── schema.ts          # Database schema (Drizzle ORM)
│
├── tests/                 # Tests
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
│
├── scripts/              # Utility scripts
├── docs/                 # Documentation
└── ...
```

---

## 🎨 Code Style

### General Guidelines

- **Language**: TypeScript for all code
- **Formatting**: Prettier (automatic on save)
- **Linting**: ESLint (fix with `npm run lint`)
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Comments**: JSDoc for public APIs, inline comments for complex logic

### TypeScript

```typescript
// ✅ Good: Explicit types
function calculateRating(violations: Violation[]): number {
  return violations.reduce((sum, v) => sum + v.penalty, 100);
}

// ❌ Bad: Implicit any
function calculateRating(violations) {
  return violations.reduce((sum, v) => sum + v.penalty, 100);
}
```

### React Components

```typescript
// ✅ Good: Functional components with TypeScript
interface EmployeeCardProps {
  employee: Employee;
  onEdit: (id: string) => void;
}

export function EmployeeCard({ employee, onEdit }: EmployeeCardProps) {
  return <div>...</div>;
}

// ❌ Bad: No types
export function EmployeeCard({ employee, onEdit }) {
  return <div>...</div>;
}
```

### Backend Code

```typescript
// ✅ Good: Repository pattern
import { repositories } from './repositories';

const employee = await repositories.employee.findById(id);

// ❌ Bad: Direct storage access (deprecated)
import { storage } from './storage';

const employee = await storage.getEmployee(id);
```

### Logging

```typescript
// ✅ Good: Use logger
import { logger } from './lib/logger';

logger.info('User logged in', { userId, email });
logger.error('Failed to save', error, { userId });

// ❌ Bad: console.log
console.log('User logged in', userId);
console.error('Error:', error);
```

---

## 📝 Commit Messages

We follow **[Conventional Commits](https://www.conventionalcommits.org/)**.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build, etc.)
- **perf**: Performance improvements

### Examples

```bash
# Feature
feat(employees): add bulk import functionality

# Bug fix
fix(rating): correct penalty calculation for late arrivals

# Documentation
docs(api): add endpoint documentation for shifts

# Refactoring
refactor(storage): migrate to repository pattern

# Tests
test(shifts): add integration tests for shift actions

# Chore
chore(deps): upgrade react to v18.3.0
```

### Scope

Use specific scopes like:
- `employees`, `shifts`, `rating`, `schedules`
- `api`, `ui`, `telegram`
- `auth`, `cache`, `logger`

---

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** if you changed functionality
2. **Add tests** for new features
3. **Run all tests** and ensure they pass
   ```bash
   npm test
   npm run test:integration
   ```
4. **Check types**
   ```bash
   npm run check
   ```
5. **Lint your code**
   ```bash
   npm run lint
   ```
6. **Update CHANGELOG.md** (if applicable)

### PR Template

When creating a PR, use this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Checklist
- [ ] My code follows the code style of this project
- [ ] I have added tests that prove my fix/feature works
- [ ] All tests pass locally
- [ ] I have updated the documentation
- [ ] My commits follow the Conventional Commits format
```

### Review Process

1. **Automated Checks**: CI/CD will run tests, linting, and type checking
2. **Code Review**: A maintainer will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

---

## 🧪 Testing

### Philosophy

- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test API endpoints with real database
- **E2E Tests**: Test full user flows (coming soon)

### Writing Tests

#### Unit Tests

```typescript
// server/services/__tests__/RatingService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatingService } from '../RatingService';

describe('RatingService', () => {
  let service: RatingService;

  beforeEach(() => {
    service = new RatingService();
  });

  it('should calculate rating correctly', () => {
    const violations = [
      { penalty_percent: 5 },
      { penalty_percent: 3 },
    ];

    const rating = service.calculateRating(violations);

    expect(rating).toBe(92); // 100 - 5 - 3
  });
});
```

#### Integration Tests

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

### Coverage Goals

- **Overall**: 80%+
- **Critical Paths**: 100%
- **New Features**: Must have tests

Check coverage:
```bash
npm run test:coverage
open coverage/index.html
```

---

## 📚 Documentation

### When to Update Documentation

- Adding new features
- Changing API endpoints
- Modifying configuration
- Creating new utilities/services

### Documentation Files

- **README.md**: Project overview and quick start
- **IMPROVEMENT_PLAN.md**: Roadmap and improvement tasks
- **API_TESTS_GUIDE.md**: Integration testing guide
- **REPOSITORY_PATTERN_GUIDE.md**: Data access patterns
- **REDIS_CACHE_SETUP.md**: Cache configuration
- **S3_BACKUP_SETUP.md**: Backup configuration
- **SENTRY_SETUP_INSTRUCTIONS.md**: Error monitoring setup
- **XSS_PROTECTION_GUIDE.md**: Security practices

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Calculate employee rating based on violations
 * 
 * @param employeeId - The employee's unique identifier
 * @param startDate - Start of rating period
 * @param endDate - End of rating period
 * @returns Rating score from 0-100
 * 
 * @example
 * ```typescript
 * const rating = await calculateRating('emp-123', startDate, endDate);
 * console.log(rating); // 95
 * ```
 */
export async function calculateRating(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Implementation
}
```

---

## ❓ Questions?

- **Issues**: https://github.com/outcasts/timeout/issues
- **Discussions**: https://github.com/outcasts/timeout/discussions
- **Email**: [maintainer email]

---

## 🏆 Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Added to the contributors page

Thank you for making outTime better! 💙

