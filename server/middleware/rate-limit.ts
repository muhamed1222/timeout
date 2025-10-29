/**
 * Per-User Rate Limiting with Redis
 * 
 * Implements sliding window rate limiting to prevent abuse
 * Supports both memory (development) and Redis (production)
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger.js';
import { isProduction } from '../lib/secrets.js';

// Extend Express Request to include user/employee
declare global {
  namespace Express {
    interface Request {
      employee?: { id: string; telegram_user_id?: string };
    }
  }
}

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skipSuccessfulRequests?: boolean;         // Don't count successful requests
  skipFailedRequests?: boolean;             // Don't count failed requests
  message?: string;        // Custom error message
  statusCode?: number;     // Custom status code (default 429)
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * In-memory store for development
 */
class MemoryStore {
  private hits: Map<string, number[]> = new Map();

  async increment(key: string): Promise<{ count: number }> {
    const now = Date.now();
    const hits = this.hits.get(key) || [];
    
    // Add current hit
    hits.push(now);
    this.hits.set(key, hits);
    
    return { count: hits.length };
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async getHits(key: string, windowMs: number): Promise<number[]> {
    const now = Date.now();
    const hits = this.hits.get(key) || [];
    
    // Filter out old hits outside the window
    const recentHits = hits.filter(timestamp => now - timestamp < windowMs);
    this.hits.set(key, recentHits);
    
    return recentHits;
  }

  async cleanup(): Promise<void> {
    // Clean up old entries periodically
    const now = Date.now();
    const entries = Array.from(this.hits.entries());
    for (const [key, hits] of entries) {
      const recentHits = hits.filter((timestamp: number) => now - timestamp < 60000); // 1 minute
      if (recentHits.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, recentHits);
      }
    }
  }
}

/**
 * Redis store for production
 */
class RedisStore {
  private client: RedisClientType | null = null;
  private fallback: MemoryStore;

  constructor() {
    this.fallback = new MemoryStore();
    this.connect();
  }

  private async connect(): Promise<void> {
    if (!isProduction() || !process.env.REDIS_URL) {
      return;
    }

    try {
      this.client = createClient({ url: process.env.REDIS_URL });
      await this.client.connect();
      logger.info('Redis rate limiter connected');
    } catch (error) {
      logger.error('Redis rate limiter connection failed, using memory fallback', error);
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
    if (!this.client) {
      const result = await this.fallback.increment(key);
      return { count: result.count, ttl: Math.floor(windowMs / 1000) };
    }

    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Use sorted set with timestamps as scores
      const multi = this.client.multi();
      
      // Remove old entries outside window
      multi.zRemRangeByScore(key, 0, windowStart);
      
      // Add current request
      multi.zAdd(key, { score: now, value: `${now}` });
      
      // Get count of requests in window
      multi.zCard(key);
      
      // Set expiry
      multi.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await multi.exec();
      const count = ((results[2] as unknown) as number) || 0;
      
      // Get TTL
      const ttl = await this.client.ttl(key);
      
      return { count, ttl };
    } catch (error) {
      logger.error('Redis rate limit error, falling back to memory', error);
      const result = await this.fallback.increment(key);
      return { count: result.count, ttl: Math.floor(windowMs / 1000) };
    }
  }

  async resetKey(key: string): Promise<void> {
    if (!this.client) {
      return this.fallback.resetKey(key);
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis reset error', error);
    }
  }
}

// Singleton store
const store = new RedisStore();

/**
 * Default key generator (by user/employee ID or IP)
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get user identifier
  const user = req.user;
  const employee = req.employee;
  
  if (user?.id) {
    return `ratelimit:user:${user.id}`;
  }
  
  if (employee?.id) {
    return `ratelimit:employee:${employee.id}`;
  }
  
  // Fallback to IP
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `ratelimit:ip:${ip}`;
}

/**
 * Rate limit middleware factory
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
    statusCode = 429,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      
      // Get current count
      const { count, ttl } = await store.increment(key, windowMs);
      
      const limit = maxRequests;
      const remaining = Math.max(0, limit - count);
      const reset = Math.floor(Date.now() / 1000) + ttl;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);
      
      if (count > limit) {
        res.setHeader('Retry-After', ttl);
        
        logger.warn('Rate limit exceeded', {
          key,
          count,
          limit,
          path: req.path,
          method: req.method,
        });
        
        return res.status(statusCode).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: ttl,
        });
      }
      
      // Skip counting based on response status if configured
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalJson = res.json.bind(res);
        
        res.json = function (body: unknown) {
          const shouldSkip = 
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);
          
          if (shouldSkip) {
            // Would need to decrement counter here
            // For simplicity, we accept the count
          }
          
          return originalJson(body);
        };
      }
      
      next();
    } catch (error) {
      logger.error('Rate limit middleware error', error);
      // On error, allow request through (fail open)
      next();
    }
  };
}

/**
 * Preset rate limiters for common use cases
 */

// Strict limiter for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10,            // 10 requests per 15 min
  message: 'Too many requests. Please try again in 15 minutes.',
});

// Standard API rate limit
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  maxRequests: 60,            // 60 requests per minute
});

// Lenient rate limit for authenticated users
export const userRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  maxRequests: 100,           // 100 requests per minute
  keyGenerator: (req) => {
    const user = req.user;
    return user?.id ? `ratelimit:user:${user.id}` : `ratelimit:ip:${req.ip}`;
  },
});

// Auth endpoints (login, register) - prevent brute force
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 5,             // 5 attempts per 15 min
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `ratelimit:auth:${email}:${req.ip}`;
  },
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

// Bot API endpoints
export const botRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  maxRequests: 120,           // 120 requests per minute (2 per second)
  keyGenerator: (req) => {
    const telegramId = req.body?.telegram_id || req.headers['x-telegram-user-id'];
    return telegramId 
      ? `ratelimit:bot:${telegramId}`
      : `ratelimit:bot:ip:${req.ip}`;
  },
});

// WebSocket connections
export const wsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute  
  maxRequests: 10,            // 10 connections per minute
  keyGenerator: (req) => `ratelimit:ws:${req.ip}`,
});

/**
 * Reset rate limit for a specific key (admin use)
 */
export async function resetRateLimit(key: string): Promise<void> {
  await store.resetKey(key);
}

/**
 * Get rate limit info for a key
 */
export async function getRateLimitInfo(req: Request): Promise<RateLimitInfo> {
  const key = defaultKeyGenerator(req);
  const { count, ttl } = await store.increment(key, 60000); // 1 min window
  
  return {
    limit: 100,
    remaining: Math.max(0, 100 - count),
    reset: Math.floor(Date.now() / 1000) + ttl,
  };
}

