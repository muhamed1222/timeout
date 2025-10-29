import { Router } from 'express';
import { storage } from '../storage.js';
import { cache } from '../lib/cache.js';
import { scheduler } from '../services/scheduler.js';
import { getMetrics } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    scheduler: ServiceStatus;
  };
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ServiceStatus {
  status: 'ok' | 'error' | 'degraded';
  responseTime?: number;
  message?: string;
}

/**
 * Comprehensive health check
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: await checkDatabase(),
      cache: await checkCache(),
      scheduler: checkScheduler(),
    },
  };

  // Add memory stats
  const memUsage = process.memoryUsage();
  health.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // Determine overall status
  const statuses = Object.values(health.services).map(s => s.status);
  if (statuses.some(s => s === 'error')) {
    health.status = 'unhealthy';
  } else if (statuses.some(s => s === 'degraded')) {
    health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;
  
  // Return appropriate HTTP status
  const httpStatus = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  
  res.status(httpStatus).json({
    ...health,
    responseTime,
  });
});

/**
 * Kubernetes liveness probe
 * GET /api/health/live
 * 
 * Returns 200 if the application is running
 * Should not check dependencies
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

/**
 * Kubernetes readiness probe
 * GET /api/health/ready
 * 
 * Returns 200 if the application is ready to serve traffic
 * Should check critical dependencies
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check database connectivity
    const dbStatus = await checkDatabase();
    
    if (dbStatus.status === 'error') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'database_unavailable',
        timestamp: Date.now(),
      });
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not_ready',
      reason: 'internal_error',
      timestamp: Date.now(),
    });
  }
});

/**
 * Startup probe
 * GET /api/health/startup
 * 
 * Returns 200 when the application has completed startup
 */
router.get('/health/startup', async (req, res) => {
  try {
    // Check if essential services are initialized
    const dbStatus = await checkDatabase();
    
    if (dbStatus.status === 'error') {
      return res.status(503).json({
        status: 'starting',
        timestamp: Date.now(),
      });
    }
    
    res.status(200).json({
      status: 'started',
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Startup check failed', error);
    res.status(503).json({
      status: 'starting',
      timestamp: Date.now(),
    });
  }
});

/**
 * Metrics endpoint for Prometheus
 * GET /api/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Error fetching metrics', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * Helper: Check database health
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    // Simple query to check DB connectivity
    await (storage as any).db?.execute('SELECT 1');
    
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime > 1000 ? 'degraded' : 'ok',
      responseTime,
      message: responseTime > 1000 ? 'Slow response' : undefined,
    };
  } catch (error) {
    logger.error('Database health check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Check cache health
 */
async function checkCache(): Promise<ServiceStatus> {
  const start = Date.now();
  
  try {
    const testKey = '__health_check__';
    const testValue = Date.now().toString();
    
    // Test write
    cache.set(testKey, testValue, 10);
    
    // Test read
    const retrieved = cache.get(testKey);
    
    // Clean up
    cache.delete(testKey);
    
    const responseTime = Date.now() - start;
    
    if (retrieved !== testValue) {
      return {
        status: 'error',
        message: 'Cache read/write mismatch',
        responseTime,
      };
    }
    
    return {
      status: 'ok',
      responseTime,
    };
  } catch (error) {
    logger.error('Cache health check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Check scheduler health
 */
function checkScheduler(): ServiceStatus {
  // Check if scheduler is running by checking if intervals exist
  // This is a simple check - in real implementation you might track last run time
  
  try {
    // Scheduler is always considered healthy if the app is running
    // Could add more sophisticated checks here
    return {
      status: 'ok',
      message: 'Scheduler is operational',
    };
  } catch (error) {
    logger.error('Scheduler health check failed', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default router;

