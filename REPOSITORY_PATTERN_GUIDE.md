# 🗂️ Repository Pattern Guide

## Overview

The application uses the **Repository Pattern** for database access, providing a clean separation between data access logic and business logic.

## Architecture

```
server/
├── repositories/
│   ├── BaseRepository.ts        # Generic CRUD operations
│   ├── CompanyRepository.ts     # Company-specific queries
│   ├── EmployeeRepository.ts    # Employee-specific queries
│   ├── ShiftRepository.ts       # Shift-specific queries
│   ├── RatingRepository.ts      # Rating & Violations queries
│   ├── ScheduleRepository.ts    # Schedule template queries
│   └── index.ts                 # Central export
└── storage.ts                   # ⚠️ DEPRECATED - Use repositories instead
```

---

## Why Repository Pattern?

### Before (storage.ts)
❌ **1000+ lines** in a single file  
❌ **Hard to test** - tightly coupled  
❌ **No reusability** - duplicate code  
❌ **Difficult to maintain** - everything in one place

### After (Repositories)
✅ **Modular** - each entity has its own repository  
✅ **Testable** - easy to mock  
✅ **Reusable** - common operations in BaseRepository  
✅ **Maintainable** - focused, single-responsibility classes

---

## Usage

### Basic CRUD Operations

All repositories inherit from `BaseRepository` with common CRUD methods:

```typescript
import { repositories } from './repositories';

// CREATE
const company = await repositories.company.create({
  name: 'Acme Corp',
  created_at: new Date(),
  updated_at: new Date(),
});

// READ
const company = await repositories.company.findById('company-id');
const allCompanies = await repositories.company.findAll();

// UPDATE
const updated = await repositories.company.update('company-id', {
  name: 'Acme Corporation',
});

// DELETE
await repositories.company.delete('company-id');

// EXISTS
const exists = await repositories.company.exists('company-id');

// COUNT
const count = await repositories.company.count();
```

---

## Repository-Specific Methods

### CompanyRepository

```typescript
// Get company with employee count
const company = await repositories.company.findByIdWithStats('company-id');
// Returns: { ...company, employeeCount: 15 }

// Paginated list
const { data, total, page, totalPages } = await repositories.company.findAllPaginated(1, 20);

// Search by name
const companies = await repositories.company.searchByName('acme');
```

### EmployeeRepository

```typescript
// Find by Telegram ID
const employee = await repositories.employee.findByTelegramId('123456789');

// Find by company
const employees = await repositories.employee.findByCompanyId('company-id');

// Find active employees only
const activeEmployees = await repositories.employee.findActiveByCompanyId('company-id');

// Find by role
const admins = await repositories.employee.findByRole('company-id', 'admin');

// Search by name or phone
const results = await repositories.employee.search('company-id', 'john');

// Count by status
const activeCount = await repositories.employee.countByStatus('company-id', 'active');

// Update status
await repositories.employee.updateStatus('employee-id', 'inactive');

// Check if belongs to company
const belongs = await repositories.employee.belongsToCompany('employee-id', 'company-id');
```

### ShiftRepository

```typescript
// Find by employee
const shifts = await repositories.shift.findByEmployeeId('employee-id', 10); // limit 10

// Find by date range
const shifts = await repositories.shift.findByEmployeeAndDateRange(
  'employee-id',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Find active shifts for company
const activeShifts = await repositories.shift.findActiveByCompany('company-id');
// Returns: Array<Shift & { employee: Employee }>

// Find today's shift
const todayShift = await repositories.shift.findTodayShift('employee-id');

// Find by status
const plannedShifts = await repositories.shift.findByStatus('company-id', 'planned');

// Shift actions
await repositories.shift.startShift('shift-id', new Date());
await repositories.shift.completeShift('shift-id', new Date());
await repositories.shift.cancelShift('shift-id');

// Count by date range
const count = await repositories.shift.countByDateRange(
  'employee-id',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### RatingRepository

```typescript
// Find rating by employee and period
const rating = await repositories.rating.findByEmployeeAndPeriod(
  'employee-id',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Find ratings by company
const ratings = await repositories.rating.findByCompanyId('company-id', 10);

// Get top rated employees
const topEmployees = await repositories.rating.getTopRated('company-id', 10);

// Calculate average rating
const avgRating = await repositories.rating.getAverageRating('company-id');

// Violations
const violation = await repositories.rating.createViolation({
  employee_id: 'employee-id',
  company_id: 'company-id',
  rule_id: 'rule-id',
  source: 'auto',
  detected_at: new Date(),
});

const violations = await repositories.rating.findViolationsByEmployee(
  'employee-id',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

const count = await repositories.rating.countViolationsByEmployee('employee-id');

// Violation Rules
const rule = await repositories.rating.createViolationRule({
  company_id: 'company-id',
  code: 'LATE',
  name: 'Late to work',
  penalty_percent: 5,
  is_active: true,
});

const rules = await repositories.rating.findViolationRulesByCompany('company-id');
const activeRules = await repositories.rating.findActiveViolationRulesByCompany('company-id');

await repositories.rating.updateViolationRule('rule-id', { penalty_percent: 7 });
await repositories.rating.deleteViolationRule('rule-id');
```

### ScheduleRepository

```typescript
// Find by company
const schedules = await repositories.schedule.findByCompanyId('company-id');

// Find active schedules only
const activeSchedules = await repositories.schedule.findActiveByCompanyId('company-id');

// Find by name
const schedule = await repositories.schedule.findByName('company-id', 'Morning Shift');

// Activate/Deactivate
await repositories.schedule.activate('schedule-id');
await repositories.schedule.deactivate('schedule-id');

// Duplicate schedule
const newSchedule = await repositories.schedule.duplicate('schedule-id', 'New Name');

// Count active schedules
const count = await repositories.schedule.countActive('company-id');
```

---

## Creating Custom Repositories

### 1. Extend BaseRepository

```typescript
import { BaseRepository } from './BaseRepository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../shared/schema.js';
import type { MyEntity, InsertMyEntity } from '../../shared/schema.js';

export class MyEntityRepository extends BaseRepository<MyEntity, InsertMyEntity> {
  constructor(db: PostgresJsDatabase<typeof schema>) {
    super(db, schema.my_entity); // Pass the table
  }

  // Add custom methods
  async findByCustomField(value: string): Promise<MyEntity[]> {
    const results = await this.db
      .select()
      .from(this.table)
      .where(eq(schema.my_entity.custom_field, value));

    return results as MyEntity[];
  }
}
```

### 2. Register in index.ts

```typescript
import { MyEntityRepository } from './MyEntityRepository.js';

export const repositories = {
  // ... existing
  myEntity: new MyEntityRepository(db),
} as const;

export { MyEntityRepository } from './MyEntityRepository.js';
```

---

## Testing Repositories

### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeRepository } from '../EmployeeRepository';

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: '1', full_name: 'Test' }]),
    };
    
    repository = new EmployeeRepository(mockDb as any);
  });

  it('should find employee by Telegram ID', async () => {
    const employee = await repository.findByTelegramId('123');
    
    expect(employee).toBeDefined();
    expect(employee?.id).toBe('1');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { repositories } from '../repositories';
import { cleanDatabase } from '../../tests/helpers/testDatabase';

describe('EmployeeRepository Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should create and find employee', async () => {
    const company = await repositories.company.create({
      name: 'Test Company',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const employee = await repositories.employee.create({
      company_id: company.id,
      full_name: 'John Doe',
      phone: '+1234567890',
      role: 'employee',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const found = await repositories.employee.findById(employee.id);
    expect(found).toMatchObject({
      full_name: 'John Doe',
      company_id: company.id,
    });
  });
});
```

---

## Migration from storage.ts

### Old Code (storage.ts)

```typescript
import { storage } from './storage';

// ❌ Old way
const employee = await storage.getEmployee('employee-id');
const employees = await storage.getEmployeesByCompany('company-id');
```

### New Code (repositories)

```typescript
import { repositories } from './repositories';

// ✅ New way
const employee = await repositories.employee.findById('employee-id');
const employees = await repositories.employee.findByCompanyId('company-id');
```

### Gradual Migration

The `storage.ts` file is still available but **deprecated**. You can migrate gradually:

1. **New code**: Use repositories from day one
2. **Existing code**: Refactor when touching the file
3. **Critical paths**: Migrate immediately for better testability

---

## Best Practices

### 1. **Use Transactions for Multi-Step Operations**

```typescript
import { db } from './repositories';

await db.transaction(async (tx) => {
  const company = await tx.insert(schema.company).values({...}).returning();
  await tx.insert(schema.employee).values({
    company_id: company[0].id,
    ...
  });
});
```

### 2. **Avoid N+1 Queries**

```typescript
// ❌ Bad: N+1 queries
const employees = await repositories.employee.findByCompanyId('company-id');
for (const emp of employees) {
  const shifts = await repositories.shift.findByEmployeeId(emp.id); // N queries!
}

// ✅ Good: Single query with join
const employeesWithShifts = await db
  .select()
  .from(schema.employee)
  .leftJoin(schema.shift, eq(schema.shift.employee_id, schema.employee.id))
  .where(eq(schema.employee.company_id, 'company-id'));
```

### 3. **Use Type Safety**

```typescript
// Repositories are fully typed
const employee: Employee = await repositories.employee.findById('id');

// TypeScript will error if you pass wrong types
await repositories.employee.create({
  full_name: 123, // ❌ Error: Type 'number' is not assignable to type 'string'
});
```

### 4. **Add Indexes for Performance**

```sql
CREATE INDEX idx_employee_company_id ON employee(company_id);
CREATE INDEX idx_shift_employee_id ON shift(employee_id);
CREATE INDEX idx_shift_status ON shift(status);
```

---

## Performance Tips

### 1. Use Select Specific Fields

```typescript
// Instead of selecting all fields
const employees = await repositories.employee.findByCompanyId('company-id');

// Select only needed fields
const employees = await db
  .select({ id: schema.employee.id, full_name: schema.employee.full_name })
  .from(schema.employee)
  .where(eq(schema.employee.company_id, 'company-id'));
```

### 2. Use Pagination

```typescript
// Always paginate large datasets
const { data, totalPages } = await repositories.company.findAllPaginated(page, limit);
```

### 3. Cache Frequently Accessed Data

```typescript
import { cache } from '../lib/cache';

async function getCompany(id: string) {
  const cached = await cache.get<Company>(`company:${id}`);
  if (cached) return cached;

  const company = await repositories.company.findById(id);
  if (company) {
    await cache.set(`company:${id}`, company, 300); // 5 minutes
  }
  
  return company;
}
```

---

## Summary

✅ **Clean Architecture** - Separation of concerns  
✅ **Type Safety** - Full TypeScript support  
✅ **Testable** - Easy to mock and test  
✅ **Reusable** - DRY principles  
✅ **Maintainable** - Focused, single-responsibility classes  
✅ **Performant** - Optimized queries  

**Start using repositories today!** 🚀

For questions or contributions, see `CONTRIBUTING.md`.





