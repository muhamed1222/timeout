# 📊 Monitoring and Observability Guide

Complete guide to monitoring, metrics, and observability in ShiftManager.

---

## 🎯 Overview

The application uses **Prometheus** for metrics collection and **Sentry** for error tracking and performance monitoring.

### Metrics Endpoints

- **Prometheus Metrics:** `GET /api/metrics`
- **Health Check:** `GET /api/health`
- **Readiness Probe:** `GET /api/health/ready`
- **Liveness Probe:** `GET /api/health/live`

---

## 📈 Prometheus Metrics

### HTTP Metrics

All HTTP requests are automatically tracked:

- `shiftmanager_http_request_duration_seconds` - Request duration histogram
- `shiftmanager_http_requests_total` - Total request counter
- `shiftmanager_http_request_size_bytes` - Request size histogram
- `shiftmanager_http_response_size_bytes` - Response size histogram

**Labels:**
- `method` - HTTP method (GET, POST, etc.)
- `route` - Route path
- `status_code` - HTTP status code

### Business Metrics

- `shiftmanager_active_shifts_total` - Number of active shifts (by company)
- `shiftmanager_employees_total` - Total employees (by company and status)
- `shiftmanager_violations_detected_total` - Violations detected (by type, severity, source)
- `shiftmanager_shifts_total` - Total shifts (by status and company)
- `shiftmanager_monitoring_runs_total` - Monitoring runs (by status)
- `shiftmanager_monitoring_duration_seconds` - Monitoring duration

### Cache Metrics

- `shiftmanager_cache_hits_total` - Cache hits (by key prefix)
- `shiftmanager_cache_misses_total` - Cache misses (by key prefix)
- `shiftmanager_cache_size_bytes` - Cache size

### Database Metrics

- `shiftmanager_database_query_duration_seconds` - Query duration (by operation and table)
- `shiftmanager_database_connections` - Active connections (by state)

### Background Jobs Metrics

- `shiftmanager_background_jobs_duration_seconds` - Job duration (by job name)
- `shiftmanager_background_jobs_total` - Total jobs (by job name and status)

### System Metrics (Default)

Prometheus client automatically collects:
- CPU usage
- Memory usage
- Event loop lag
- Garbage collection duration
- Process uptime

---

## 🔍 Sentry Error Tracking

### Configuration

Sentry is automatically initialized if `SENTRY_DSN` environment variable is set.

**Features:**
- ✅ Error tracking (100% of errors in production)
- ✅ Performance monitoring (10% sampling in production)
- ✅ Profiling (10% sampling in production)
- ✅ Breadcrumbs for debugging
- ✅ User context tracking
- ✅ Release tracking

### Usage

#### Automatic Error Tracking

Errors are automatically captured via error handler middleware:

```typescript
// In errorHandler.ts - automatically sends to Sentry
if (!isOperationalError(appError) && process.env.NODE_ENV === 'production') {
  Sentry.captureException(appError, {
    tags: { path: req.path, method: req.method },
    extra: { body: req.body, query: req.query }
  });
}
```

#### Manual Error Tracking

```typescript
import { captureException, setUserContext } from './lib/sentry';

// Capture exception
try {
  // Your code
} catch (error) {
  captureException(error, { context: 'additional info' });
}

// Set user context
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username
});
```

#### Performance Monitoring

Transactions are automatically tracked for all HTTP requests. Custom transactions:

```typescript
import { Sentry } from './lib/sentry';

const transaction = Sentry.startTransaction({
  op: 'db.query',
  name: 'GetEmployees'
});

// Your code

transaction.finish();
```

---

## 📊 Viewing Metrics

### Local Development

1. **Start application:**
   ```bash
   npm run dev
   ```

2. **View Prometheus metrics:**
   ```bash
   curl http://localhost:5000/api/metrics
   ```

3. **View health check:**
   ```bash
   curl http://localhost:5000/api/health
   ```

### Production

1. **Metrics endpoint:** `https://your-domain.com/api/metrics`
2. **Scrape with Prometheus:**
   ```yaml
   scrape_configs:
     - job_name: 'shiftmanager'
       scrape_interval: 15s
       metrics_path: '/api/metrics'
       static_configs:
         - targets: ['your-domain.com']
   ```

3. **Grafana Dashboard:**
   - Import Prometheus data source
   - Create dashboards for:
     - HTTP request rates and latency
     - Business metrics (shifts, employees, violations)
     - System metrics (CPU, memory)
     - Error rates

---

## 🚨 Alerting

### Prometheus Alerts

Example alerts configuration (`prometheus-alerts.yml`):

```yaml
groups:
  - name: shiftmanager
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(shiftmanager_http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      # Slow requests
      - alert: SlowRequests
        expr: histogram_quantile(0.95, shiftmanager_http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "95th percentile request latency > 2s"

      # Database issues
      - alert: DatabaseSlow
        expr: histogram_quantile(0.95, shiftmanager_database_query_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "Database queries are slow"

      # High violation rate
      - alert: HighViolationRate
        expr: rate(shiftmanager_violations_detected_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High violation detection rate"
```

### Sentry Alerts

Configure in Sentry dashboard:
1. Go to **Alerts** → **Create Alert Rule**
2. Set conditions:
   - Error rate > threshold
   - Specific error types
   - Performance degradation
3. Configure notifications (email, Slack, etc.)

---

## 🔧 Configuration

### Environment Variables

```env
# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Metrics (optional)
METRICS_UPDATE_INTERVAL=60000  # Update business metrics every 60 seconds
ENABLE_METRICS=true            # Enable metrics collection
```

### Disable Metrics

To disable Prometheus metrics:

```typescript
// In server/index.ts
if (process.env.ENABLE_METRICS !== 'false') {
  app.use("/api", metricsMiddleware);
}
```

---

## 📚 Best Practices

### 1. Use Appropriate Metric Types

- **Counter:** For monotonically increasing values (total requests, violations)
- **Gauge:** For values that can go up or down (active shifts, cache size)
- **Histogram:** For distributions (request duration, query time)

### 2. Label Cardinality

Keep label cardinality low to avoid metric explosion:

✅ Good:
```typescript
shiftsCounter.labels('active', companyId).inc();
```

❌ Bad:
```typescript
shiftsCounter.labels('active', companyId, employeeId, shiftId).inc();
```

### 3. Error Tracking

- ✅ Always log errors before capturing
- ✅ Add context to exceptions
- ✅ Set user context early
- ✅ Filter sensitive data in `beforeSend`

### 4. Performance Monitoring

- ✅ Use transactions for important operations
- ✅ Track database query duration
- ✅ Monitor background job duration
- ✅ Set appropriate sample rates

---

## 🔍 Troubleshooting

### Metrics Not Appearing

1. **Check middleware is applied:**
   ```bash
   # Should see metricsMiddleware in routes.ts
   grep metricsMiddleware server/routes.ts
   ```

2. **Check metrics endpoint:**
   ```bash
   curl http://localhost:5000/api/metrics | grep shiftmanager
   ```

3. **Check logs:**
   ```bash
   # Should see "Business metrics updated successfully"
   ```

### Sentry Not Capturing Errors

1. **Check DSN is set:**
   ```bash
   echo $SENTRY_DSN
   ```

2. **Check initialization:**
   ```bash
   # Look for "Sentry initialized successfully" in logs
   ```

3. **Check environment:**
   - Errors are only sent in production
   - Set `NODE_ENV=production` to test

### High Memory Usage

If metrics are consuming too much memory:

1. Reduce sample rates
2. Increase metric update interval
3. Disable default metrics collection for specific metrics

---

## 📊 Example Queries

### Prometheus Queries

**Request rate by endpoint:**
```promql
rate(shiftmanager_http_requests_total[5m])
```

**95th percentile latency:**
```promql
histogram_quantile(0.95, shiftmanager_http_request_duration_seconds)
```

**Active shifts by company:**
```promql
shiftmanager_active_shifts_total
```

**Violation rate by type:**
```promql
rate(shiftmanager_violations_detected_total[5m])
```

---

## 🔗 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [prom-client Documentation](https://github.com/siimon/prom-client)

---

**Last Updated:** January 2025  
**Status:** ✅ Fully Configured

