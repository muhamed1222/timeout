/**
 * Cache utility functions
 * Centralizes cache operations to reduce duplication
 * Uses async cache interface for Redis compatibility
 */

import { cacheAsync } from '../cache.js';
import { repositories } from '../../repositories/index.js';
import { logger } from '../logger.js';

/**
 * Invalidate company stats cache
 * Helper function to reduce duplication
 */
export async function invalidateCompanyStats(companyId: string): Promise<void> {
  try {
    await cacheAsync.delete(`company:${companyId}:stats`);
    logger.debug(`Invalidated cache for company stats: ${companyId}`);
  } catch (error) {
    logger.error(`Error invalidating company stats cache for ${companyId}`, error);
  }
}

/**
 * Invalidate company stats cache by employee ID
 * Looks up employee to get company_id, then invalidates cache
 */
export async function invalidateCompanyStatsByEmployeeId(employeeId: string): Promise<void> {
  try {
    const employee = await repositories.employee.findById(employeeId);
    if (employee) {
      await invalidateCompanyStats(employee.company_id);
    }
  } catch (error) {
    logger.error(`Error invalidating company stats cache by employee ID ${employeeId}`, error);
  }
}

/**
 * Invalidate company stats cache by shift
 * Extracts employee_id from shift and invalidates cache
 */
export async function invalidateCompanyStatsByShift(shift: { employee_id: string }): Promise<void> {
  await invalidateCompanyStatsByEmployeeId(shift.employee_id);
}

/**
 * Get cached value or execute function and cache result
 * @param key Cache key
 * @param fetcher Function to fetch data if not cached
 * @param ttl Time to live in seconds (default: 300)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await cacheAsync.get<T>(key);
    if (cached !== undefined) {
      logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    logger.debug(`Cache miss for key: ${key}`);
    const data = await fetcher();
    
    // Cache the result
    await cacheAsync.set(key, data, ttl);
    
    return data;
  } catch (error) {
    logger.error(`Cache error for key ${key}`, error);
    // On cache error, still try to fetch data
    return await fetcher();
  }
}

