# 2. Use PostgreSQL with Drizzle ORM

Date: 2025-10-30

## Status

Accepted

## Context

We need a robust, scalable database solution for the outTime application. The system must:
- Handle relational data (companies, employees, shifts, ratings)
- Support complex queries and joins
- Provide strong data consistency (ACID compliance)
- Scale to thousands of employees across multiple companies
- Support JSON data for flexible fields
- Enable full-text search capabilities

We also need an ORM or query builder to:
- Provide type safety with TypeScript
- Generate SQL migrations automatically
- Support complex queries with good DX
- Have minimal performance overhead
- Work well with modern tooling

### Options Considered

**Database:**
1. **PostgreSQL** - Mature, feature-rich, ACID compliant
2. **MySQL** - Popular, but less feature-rich
3. **MongoDB** - NoSQL, flexible schema, but weak consistency
4. **SQLite** - Simple, but not suitable for multi-user apps

**ORM/Query Builder:**
1. **Drizzle ORM** - TypeScript-first, lightweight, modern
2. **Prisma** - Popular, but heavier with its own DSL
3. **TypeORM** - Mature, but decorator-heavy
4. **Kysely** - Type-safe SQL builder, but more verbose

## Decision

We will use **PostgreSQL 14+** as our database with **Drizzle ORM** as our query builder.

### Why PostgreSQL?

- **Mature & Reliable**: Battle-tested in production for decades
- **Feature-Rich**: JSON support, full-text search, advanced indexes
- **ACID Compliance**: Strong consistency guarantees
- **Performance**: Excellent query optimizer and scalability
- **Community**: Large ecosystem and extensive documentation
- **Free & Open Source**: No licensing costs

### Why Drizzle ORM?

- **TypeScript-First**: Designed from the ground up for TypeScript
- **Lightweight**: ~7KB gzipped, minimal runtime overhead
- **Type Safety**: Excellent inference, catches errors at compile time
- **SQL-Like Syntax**: Easy to learn if you know SQL
- **Migrations**: Automatic migration generation with `drizzle-kit`
- **Performance**: Direct SQL queries, no N+1 problems
- **Modern**: Built for modern JavaScript tooling

## Consequences

### Positive

- **Type Safety**: Full TypeScript support prevents runtime errors
- **Performance**: PostgreSQL's query optimizer is excellent
- **Scalability**: Can handle millions of rows without issues
- **Flexibility**: JSON columns for flexible data structures
- **Developer Experience**: Drizzle's API is intuitive and discoverable
- **Migrations**: Automatic generation saves time and reduces errors
- **Cost**: PostgreSQL is free and runs anywhere

### Negative

- **Learning Curve**: Team needs to learn PostgreSQL and Drizzle
- **Infrastructure**: Requires PostgreSQL server (vs SQLite)
- **Migrations**: Need careful management in production
- **Complexity**: More complex than simple key-value stores

### Mitigation

- Provide comprehensive documentation and examples
- Use Supabase for managed PostgreSQL hosting
- Implement repository pattern for easier testing
- Use transactions for data consistency
- Monitor query performance with logging

## Examples

### Schema Definition

```typescript
// shared/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const company = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
```

### Type-Safe Queries

```typescript
// Fully typed, catches errors at compile time
const employees = await db
  .select()
  .from(schema.employee)
  .where(eq(schema.employee.company_id, companyId));
```

### Migrations

```bash
# Generate migration automatically
npm run db:generate

# Apply migrations
npm run db:push
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Database Selection Comparison](https://www.prisma.io/dataguide/database-comparison)




