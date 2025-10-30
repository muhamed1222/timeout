# 🔴 Redis Cache Setup Guide

## Overview

The application automatically uses Redis for caching in production when `REDIS_URL` is set, otherwise it falls back to in-memory cache for development.

---

## Development (In-Memory Cache)

No setup required! The application will automatically use in-memory cache when `REDIS_URL` is not set.

**Features:**
- ✅ Zero configuration
- ✅ Automatic cleanup of expired entries
- ✅ Perfect for local development
- ⚠️ Data is lost on server restart
- ⚠️ Not shared across multiple instances

---

## Production (Redis)

### Option 1: Upstash (Recommended for Vercel)

1. **Create Account**: https://upstash.com/
2. **Create Redis Database**:
   - Click "Create Database"
   - Choose region closest to your app
   - Select "Global" for multi-region
3. **Get Connection URL**:
   - Copy the `REDIS_URL` from dashboard
   - Format: `redis://default:password@host:port`

4. **Add to Environment Variables**:
   ```env
   REDIS_URL=redis://default:xxxxx@us1-your-db.upstash.io:6379
   ```

**Pricing:**
- Free tier: 10,000 commands/day
- Pay-as-you-go: ~$0.20 per 100k commands

### Option 2: Redis Cloud

1. **Create Account**: https://redis.com/try-free/
2. **Create Database**:
   - Click "New Database"
   - Select cloud provider and region
   - Choose "Fixed" plan (30MB free)
3. **Get Connection Details**:
   - Host, port, and password from database details
4. **Format URL**:
   ```env
   REDIS_URL=redis://default:password@your-endpoint.cloud.redislabs.com:12345
   ```

### Option 3: Self-Hosted Redis

#### Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis_data:
```

Then:
```bash
docker-compose up -d redis
```

**Environment Variable**:
```env
REDIS_URL=redis://localhost:6379
```

#### Native Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

---

## Verification

### Check Connection

The application logs will show:
```
Initializing Redis cache
```

### Test Cache

Use the `/api/health` endpoint:
```bash
curl http://localhost:5000/api/health
```

Response should include cache status:
```json
{
  "status": "healthy",
  "cache": "redis",
  "uptime": 12345
}
```

---

## Configuration

### TTL (Time To Live)

Default: 300 seconds (5 minutes)

```typescript
// Custom TTL
await cache.set('key', value, 3600); // 1 hour
```

### Clear Cache

```typescript
// Clear all cache
await cache.clear();

// Delete specific key
await cache.delete('user:123');
```

---

## Monitoring

### Redis CLI

```bash
# Connect to local Redis
redis-cli

# Connect to remote Redis
redis-cli -h your-host.com -p 6379 -a your-password
```

**Useful commands:**
```redis
# Check keys
KEYS *

# Get key value
GET key_name

# Check key TTL
TTL key_name

# Memory usage
INFO memory

# Cache hit rate
INFO stats
```

### Upstash Console

- Monitor usage in dashboard
- View slow queries
- Set up alerts for high usage

---

## Best Practices

### 1. **Use Appropriate TTLs**
```typescript
// User data - 5 minutes
await cache.set('user:123', userData, 300);

// Dashboard stats - 1 minute
await cache.set('stats:today', stats, 60);

// Configuration - 1 hour
await cache.set('config:app', config, 3600);
```

### 2. **Handle Cache Misses**
```typescript
async function getUserData(userId: string) {
  // Try cache first
  const cached = await cache.get<UserData>(`user:${userId}`);
  if (cached) return cached;
  
  // Fetch from database
  const data = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  // Update cache
  if (data) {
    await cache.set(`user:${userId}`, data, 300);
  }
  
  return data;
}
```

### 3. **Invalidate on Updates**
```typescript
// Update database
await db.update(users)
  .set({ name: newName })
  .where(eq(users.id, userId));

// Invalidate cache
await cache.delete(`user:${userId}`);
```

### 4. **Use Key Patterns**
```typescript
// Good patterns
'user:123'
'company:456:employees'
'dashboard:stats:2024-01-15'

// Bad patterns
'123'
'data'
'cache_key'
```

---

## Troubleshooting

### Connection Refused

**Problem**: `Error: connect ECONNREFUSED`

**Solutions**:
1. Check Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```
2. Verify `REDIS_URL` format
3. Check firewall rules
4. Ensure Redis accepts remote connections

### Authentication Failed

**Problem**: `Error: NOAUTH Authentication required`

**Solution**: Include password in URL:
```env
REDIS_URL=redis://default:your_password@host:port
```

### Out of Memory

**Problem**: `OOM command not allowed when used memory > 'maxmemory'`

**Solutions**:
1. Increase Redis memory limit
2. Set eviction policy:
   ```bash
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
3. Reduce TTLs
4. Clear old keys

### Slow Queries

**Check slow log**:
```bash
redis-cli SLOWLOG GET 10
```

**Solutions**:
- Use appropriate data structures
- Avoid `KEYS *` in production
- Use pipelining for multiple operations

---

## Migration from In-Memory

The cache interface is identical, so switching from in-memory to Redis requires **zero code changes**.

Just set the `REDIS_URL` environment variable:

```bash
# Before (in-memory)
# No REDIS_URL set

# After (Redis)
REDIS_URL=redis://your-redis-url
```

The application will automatically use Redis on next restart.

---

## Performance

### Latency

- **In-memory**: < 1ms
- **Redis (local)**: 1-2ms
- **Redis (cloud)**: 5-20ms
- **Redis (global)**: 20-50ms

### Throughput

- **In-memory**: Unlimited (RAM)
- **Redis**: 50k-100k ops/sec (single instance)
- **Upstash Global**: Auto-scaling

---

## Cost Estimation

### Upstash (Pay-as-you-go)

Assuming:
- 1000 active users
- 10 requests/user/day
- 5 cache reads per request

**Usage**: 1000 × 10 × 5 = 50,000 commands/day

**Cost**: $0 (within free tier of 10k/day if using Global)

### Redis Cloud

**Fixed plan**: $0/month (30MB)  
**Flexible plan**: $5/month (100MB)

**Recommendation**: Start with free tier, upgrade if needed.

---

## Summary

✅ **Development**: No setup required (in-memory)  
✅ **Production**: Set `REDIS_URL` for Redis  
✅ **Recommended**: Upstash for serverless deployments  
✅ **Zero code changes**: Automatic fallback  

For most applications, the free tier of Upstash is sufficient!




