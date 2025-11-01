# 3. Repository Pattern for Data Access

Date: 2025-10-30

## Status

Accepted

Supersedes: Direct storage.ts access

## Context

Our application initially used a single `storage.ts` file with 1000+ lines containing all database operations. This approach has several problems:

- **Difficult to Test**: Tightly coupled to database, hard to mock
- **Hard to Maintain**: Single file becomes unwieldy
- **No Separation of Concerns**: Business logic mixed with data access
- **Code Duplication**: Similar patterns repeated across entities
- **Poor Discoverability**: Hard to find specific operations

As the application grows, we need a better pattern for data access that provides:
- Clear separation between business logic and data access
- Easy testability through dependency injection
- Reusable CRUD operations
- Consistent query patterns
- Type safety throughout

### Options Considered

1. **Continue with storage.ts** - Keep current approach
   - Simple initially
   - But doesn't scale
   
2. **Repository Pattern** - Separate repositories per entity
   - Clear separation of concerns
   - Easy to test with mocks
   - Reusable base class
   
3. **Service Layer Only** - Services directly use ORM
   - Simpler than repositories
   - But mixes concerns
   
4. **DAO Pattern** - Data Access Objects
   - Similar to Repository
   - But more Java-oriented

## Decision

We will implement the **Repository Pattern** with:

1. **BaseRepository**: Generic CRUD operations for all entities
2. **Entity Repositories**: Specific repositories per entity (Company, Employee, Shift, etc.)
3. **Centralized Export**: All repositories accessible from single import
4. **Deprecate storage.ts**: Mark old file as deprecated, migrate gradually

### Structure

```
server/
├── repositories/
│   ├── BaseRepository.ts       # Generic CRUD
│   ├── CompanyRepository.ts
│   ├── EmployeeRepository.ts
│   ├── ShiftRepository.ts
│   ├── RatingRepository.ts
│   ├── ScheduleRepository.ts
│   └── index.ts               # Central export
└── storage.ts                 # @deprecated
```

### Implementation

```typescript
// BaseRepository provides common operations
export abstract class BaseRepository<T, TInsert> {
  async findById(id: string): Promise<T | undefined>
  async findAll(): Promise<T[]>
  async create(data: TInsert): Promise<T>
  async update(id: string, updates: Partial<TInsert>): Promise<T | undefined>
  async delete(id: string): Promise<void>
  async exists(id: string): Promise<boolean>
  async count(whereClause?: any): Promise<number>
}

// Entity repositories extend base and add specific methods
export class EmployeeRepository extends BaseRepository<Employee, InsertEmployee> {
  async findByTelegramId(telegramId: string): Promise<Employee | undefined>
  async findByCompanyId(companyId: string): Promise<Employee[]>
  async findActiveByCompanyId(companyId: string): Promise<Employee[]>
  // ... other employee-specific methods
}
```

## Consequences

### Positive

- **Testability**: Easy to mock repositories in tests
- **Maintainability**: Each repository is focused and manageable
- **Reusability**: BaseRepository eliminates code duplication
- **Type Safety**: Full TypeScript support with generics
- **Discoverability**: Clear where to find operations
- **Separation of Concerns**: Data access separated from business logic
- **Consistent Patterns**: All entities follow same structure

### Negative

- **More Files**: One file per entity instead of single storage.ts
- **Learning Curve**: Team needs to learn repository pattern
- **Migration Effort**: Existing code needs gradual migration
- **Abstraction Layer**: Additional layer between services and database

### Mitigation

- Provide comprehensive documentation (REPOSITORY_PATTERN_GUIDE.md)
- Keep storage.ts for backward compatibility during migration
- Mark old methods as @deprecated with migration instructions
- Use TypeScript to ensure type safety during migration
- Migrate critical paths first, less critical code gradually

## Migration Strategy

1. **Phase 1**: Create repository infrastructure
   - Implement BaseRepository
   - Create entity repositories
   - Export from central index

2. **Phase 2**: Mark storage.ts as deprecated
   - Add @deprecated JSDoc comments
   - Add migration instructions

3. **Phase 3**: Gradual migration
   - New code uses repositories from day one
   - Refactor existing code when touching files
   - No breaking changes to existing code

4. **Phase 4**: Complete migration
   - All code uses repositories
   - Remove storage.ts

## Examples

### Before (storage.ts)

```typescript
import { storage } from './storage';

const employee = await storage.getEmployee(id);
const employees = await storage.getEmployeesByCompany(companyId);
```

### After (Repositories)

```typescript
import { repositories } from './repositories';

const employee = await repositories.employee.findById(id);
const employees = await repositories.employee.findByCompanyId(companyId);
```

### Testing

```typescript
// Easy to mock
const mockEmployeeRepo = {
  findById: vi.fn().mockResolvedValue(mockEmployee),
  findByCompanyId: vi.fn().mockResolvedValue([mockEmployee]),
};

const service = new EmployeeService(mockEmployeeRepo);
```

## References

- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [REPOSITORY_PATTERN_GUIDE.md](../../REPOSITORY_PATTERN_GUIDE.md)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)





