/**
 * Request Timeout Middleware
 * Automatically cancels requests that take too long
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

const DEFAULT_TIMEOUT = 5000; // 5 seconds

export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT) {
  return (req: Request, res: Response, next: NextFunction) => {
    let isFinished = false;

    // Set timeout
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (!isFinished && !res.headersSent) {
        isFinished = true;
        logger.warn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
        });
        
        res.status(503).json({
          error: 'Request timeout',
          message: 'Request took too long. Please try again.',
          timeout: timeoutMs,
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    const clearTimeoutWrapper = (fn: typeof originalSend) => {
      return function(this: Response, ...args: Parameters<typeof originalSend>) {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(timeoutId);
        }
        return fn.apply(this, args);
      };
    };

    res.send = clearTimeoutWrapper(originalSend);
    res.json = clearTimeoutWrapper(originalJson);
    res.end = clearTimeoutWrapper(originalEnd);

    // Also clear on finish event
    res.on('finish', () => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
      }
    });

    next();
  };
}

