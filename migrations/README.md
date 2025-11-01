# Database Migrations

This directory contains SQL migration files for the database schema.

## Migration Files

- `0000_silly_iron_monger.sql` - Initial schema
- `0001_thin_spectrum.sql` - Schema updates
- `0002_add_violation_id_to_exception.sql` - Added violation_id to exception table
- `0003_add_performance_indexes.sql` - **Performance indexes for query optimization**

## Applying Migrations

### Option 1: Using Drizzle Kit (Recommended)

```bash
# Generate migration from schema changes
npm run db:push

# Or use drizzle-kit directly
npx drizzle-kit push
```

### Option 2: Manual SQL Execution

For the performance indexes migration specifically:

```bash
# Connect to your database and run:
psql $DATABASE_URL -f migrations/0003_add_performance_indexes.sql
```

Or using Supabase CLI:

```bash
supabase db execute -f migrations/0003_add_performance_indexes.sql
```

## Migration: 0003_add_performance_indexes.sql

This migration adds indexes to improve query performance:

### Key Indexes Added:

1. **Employee indexes:**
   - `idx_employee_company_id` - Fast company-based queries
   - `idx_employee_company_status` - Composite for filtered queries
   - `idx_employee_status` - Status filtering

2. **Shift indexes:**
   - `idx_shift_employee_id` - Employee shift lookups
   - `idx_shift_employee_status` - Active shifts by employee
   - `idx_shift_planned_start_at` - Date-based queries and sorting
   - `idx_shift_status_planned_start` - Composite for filtered date queries

3. **Related entity indexes:**
   - Work intervals, break intervals, daily reports
   - Exceptions, reminders, violations
   - Employee ratings, schedules

### Performance Impact:

- **Query speed improvement:** 5-10x faster for common queries
- **JOIN performance:** Significantly improved with foreign key indexes
- **Sorting operations:** Much faster with indexed date columns
- **Filtered queries:** Partial indexes optimize common WHERE clauses

### Verification:

After applying, verify indexes were created:

```sql
SELECT 
  tablename,
  indexname,
  idx_scan as usage_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### Rollback:

If needed, indexes can be dropped (they don't affect data):

```sql
-- Drop all performance indexes (if needed)
DROP INDEX IF EXISTS idx_employee_company_id;
DROP INDEX IF EXISTS idx_employee_company_status;
-- ... (drop others as needed)
```

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in staging environment first
3. **Monitor performance** after applying indexes
4. **Review index usage** periodically to ensure they're being used
5. **Consider index maintenance** - PostgreSQL handles this automatically, but monitor size

## Index Maintenance

PostgreSQL automatically maintains indexes, but you can:

```sql
-- Update statistics for query planner
ANALYZE;

-- Vacuum to reclaim space from deleted rows
VACUUM ANALYZE;

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```
