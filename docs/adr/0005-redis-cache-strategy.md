# 5. Redis Cache Strategy with In-Memory Fallback

Date: 2025-10-30

## Status

Accepted

## Context

Our application makes frequent database queries for:
- Company information (accessed on every request)
- Employee data (displayed across multiple pages)
- Rating calculations (expensive to compute)
- Dashboard statistics (aggregated queries)

Without caching, we experience:
- High database load
- Slow response times
- Expensive aggregation queries
- Unnecessary repeated calculations

We need a caching strategy that:
- Reduces database load
- Improves response times
- Works in development without additional setup
- Scales to production with proper distributed cache
- Has automatic fallback for simplicity

### Options Considered

1. **No Caching**
   - Simple
   - Poor performance
   - High database load

2. **In-Memory Only** (Node.js Map)
   - Zero setup
   - Doesn't work across multiple instances
   - Data lost on restart

3. **Redis Only**
   - Excellent for production
   - Requires Redis server in development
   - Extra setup complexity

4. **Hybrid: Redis with In-Memory Fallback**
   - Best of both worlds
   - Automatic in development
   - Scalable in production

## Decision

We will implement a **Hybrid Caching Strategy** using:
- **Redis** for production (distributed, persistent)
- **In-Memory Cache** for development (zero setup)
- **Automatic fallback** based on `REDIS_URL` environment variable
- **Unified CacheAdapter interface** for consistency

### Architecture

```typescript
// CacheAdapter interface
interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Automatic selection
export const cache = env.REDIS_URL
  ? new RedisCache(env.REDIS_URL)
  : new InMemoryCache();
```

### Cache Strategy

- **Company Data**: 5 minutes (rarely changes)
- **Employee Data**: 5 minutes (updated infrequently)
- **Dashboard Stats**: 1 minute (real-time feel)
- **Rating Calculations**: 1 hour (expensive to compute)
- **Configuration**: 1 hour (rarely changes)

## Consequences

### Positive

- **Zero Setup in Dev**: Works out of the box with in-memory cache
- **Production Ready**: Redis provides distributed caching
- **Improved Performance**: Reduced database load and faster responses
- **Automatic Fallback**: No configuration needed for basic setup
- **Type Safe**: Full TypeScript support
- **Consistent API**: Same interface for both implementations
- **Flexible TTLs**: Different cache durations per use case

### Negative

- **Cache Invalidation**: Classic computer science problem
- **Stale Data Risk**: Cached data may be outdated
- **Memory Usage**: In-memory cache uses server RAM
- **Redis Cost**: Redis hosting costs in production
- **Complexity**: Additional layer to debug

### Mitigation

- **Invalidate on Updates**: Clear cache when data changes
- **Short TTLs**: Use appropriate TTLs for each data type
- **Monitoring**: Log cache hits/misses for optimization
- **Graceful Degradation**: App works if cache fails
- **Documentation**: Clear guidelines on when to cache

## Implementation

### Usage Example

```typescript
import { cache } from './lib/cache';

// Get from cache
async function getCompany(id: string): Promise<Company> {
  const cached = await cache.get<Company>(`company:${id}`);
  if (cached) return cached;

  // Fetch from database
  const company = await repositories.company.findById(id);
  if (company) {
    await cache.set(`company:${id}`, company, 300); // 5 minutes
  }

  return company;
}

// Invalidate on update
async function updateCompany(id: string, updates: Partial<Company>) {
  const updated = await repositories.company.update(id, updates);
  
  // Invalidate cache
  await cache.delete(`company:${id}`);
  
  return updated;
}
```

### Key Patterns

```typescript
// Entity caching
`company:${id}`
`employee:${id}`
`shift:${id}`

// Collection caching
`company:${companyId}:employees`
`company:${companyId}:active-shifts`

// Computed data
`rating:${employeeId}:${period}`
`dashboard:${companyId}:stats`
```

## Cache Invalidation Strategy

### On Create
- Don't cache immediately (let first GET cache it)
- Invalidate collection caches

### On Update
- Invalidate specific entity cache: `cache.delete('entity:id')`
- Invalidate related collection caches

### On Delete
- Invalidate specific entity cache
- Invalidate collection caches

### Example

```typescript
// Create employee
async function createEmployee(data: InsertEmployee) {
  const employee = await repositories.employee.create(data);
  
  // Invalidate company's employee list
  await cache.delete(`company:${data.company_id}:employees`);
  
  return employee;
}

// Update employee
async function updateEmployee(id: string, updates: Partial<Employee>) {
  const employee = await repositories.employee.update(id, updates);
  
  // Invalidate specific employee
  await cache.delete(`employee:${id}`);
  
  // If status changed, invalidate active employees list
  if (updates.status) {
    const companyId = employee?.company_id;
    await cache.delete(`company:${companyId}:active-employees`);
  }
  
  return employee;
}
```

## Production Setup

### Local Development
```bash
# No setup needed! Uses in-memory cache automatically
npm run dev
```

### Production (Upstash)
```bash
# Add to .env
REDIS_URL=redis://default:password@redis.upstash.io:6379
```

### Production (Docker)
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

## Monitoring

### Metrics to Track
- Cache hit rate
- Cache miss rate
- Average response time (cached vs uncached)
- Cache size and memory usage
- Redis connection errors

### Logging

```typescript
// Log cache operations
logger.debug('Cache hit', { key });
logger.debug('Cache miss', { key });
logger.warn('Cache error', error, { key });
```

## Performance Impact

### Expected Improvements
- **Database Queries**: 60-80% reduction
- **Response Time**: 50-70% faster for cached data
- **Server Load**: 40-50% reduction

### Benchmarks
- Cold cache: ~100ms (database query)
- Warm cache (in-memory): ~1ms
- Warm cache (Redis): ~5-10ms

## References

- [Redis Documentation](https://redis.io/docs/)
- [Upstash (Serverless Redis)](https://upstash.com/)
- [Cache Invalidation Strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/Strategies.html)
- [REDIS_CACHE_SETUP.md](../../REDIS_CACHE_SETUP.md)




