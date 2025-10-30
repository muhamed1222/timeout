import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

/**
 * Prometheus Metrics
 */

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  prefix: 'shiftmanager_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'shiftmanager_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestTotal = new Counter({
  name: 'shiftmanager_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestSize = new Histogram({
  name: 'shiftmanager_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000],
});

export const httpResponseSize = new Histogram({
  name: 'shiftmanager_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000],
});

// Business Metrics
export const activeShiftsGauge = new Gauge({
  name: 'shiftmanager_active_shifts_total',
  help: 'Number of currently active shifts',
  labelNames: ['company_id'],
});

export const employeesGauge = new Gauge({
  name: 'shiftmanager_employees_total',
  help: 'Total number of employees',
  labelNames: ['company_id', 'status'],
});

export const violationsCounter = new Counter({
  name: 'shiftmanager_violations_detected_total',
  help: 'Total number of violations detected',
  labelNames: ['type', 'severity', 'source'],
});

export const shiftsCounter = new Counter({
  name: 'shiftmanager_shifts_total',
  help: 'Total number of shifts',
  labelNames: ['status', 'company_id'],
});

export const monitoringRunsCounter = new Counter({
  name: 'shiftmanager_monitoring_runs_total',
  help: 'Total number of monitoring runs',
  labelNames: ['status'],
});

export const monitoringDuration = new Histogram({
  name: 'shiftmanager_monitoring_duration_seconds',
  help: 'Duration of monitoring runs in seconds',
  buckets: [1, 5, 10, 30, 60, 120],
});

// Cache Metrics
export const cacheHits = new Counter({
  name: 'shiftmanager_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['key_prefix'],
});

export const cacheMisses = new Counter({
  name: 'shiftmanager_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['key_prefix'],
});

export const cacheSize = new Gauge({
  name: 'shiftmanager_cache_size_bytes',
  help: 'Size of cache in bytes',
});

// Database Metrics
export const databaseQueryDuration = new Histogram({
  name: 'shiftmanager_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const databaseConnections = new Gauge({
  name: 'shiftmanager_database_connections',
  help: 'Number of active database connections',
  labelNames: ['state'],
});

// Background Jobs Metrics
export const backgroundJobsDuration = new Histogram({
  name: 'shiftmanager_background_jobs_duration_seconds',
  help: 'Duration of background jobs in seconds',
  labelNames: ['job_name'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const backgroundJobsTotal = new Counter({
  name: 'shiftmanager_background_jobs_total',
  help: 'Total number of background jobs executed',
  labelNames: ['job_name', 'status'],
});

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Track request size
  const requestSize = parseInt(req.get('content-length') || '0', 10);
  if (requestSize > 0) {
    httpRequestSize.labels(req.method, route).observe(requestSize);
  }
  
  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();
    
    // Track response size
    const responseSize = parseInt(res.get('content-length') || '0', 10);
    if (responseSize > 0) {
      httpResponseSize.labels(req.method, route).observe(responseSize);
    }
  });
  
  next();
}

/**
 * Update business metrics
 */
export async function updateBusinessMetrics(): Promise<void> {
  try {
    // This would fetch real data from storage
    // For now, this is a placeholder
    // Example:
    // const activeShifts = await storage.getActiveShiftsCount();
    // activeShiftsGauge.set(activeShifts);
  } catch (error) {
    logger.error('Error updating business metrics', error);
  }
}

/**
 * Start metrics updater (runs every minute)
 */
let metricsUpdateInterval: NodeJS.Timeout | null = null;

export function startMetricsUpdater(intervalMs = 60000): void {
  if (metricsUpdateInterval) {
    return;
  }
  
  metricsUpdateInterval = setInterval(() => {
    updateBusinessMetrics();
  }, intervalMs);
}

export function stopMetricsUpdater(): void {
  if (metricsUpdateInterval) {
    clearInterval(metricsUpdateInterval);
    metricsUpdateInterval = null;
  }
}

/**
 * Get all metrics
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Get metrics in JSON format
 */
export async function getMetricsJSON(): Promise<any> {
  return await register.getMetricsAsJSON();
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  register.clear();
}

export { register };

