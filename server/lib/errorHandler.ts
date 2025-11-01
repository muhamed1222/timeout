/**
 * Express Error Handler Middleware
 * 
 * Standardizes error handling across all routes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
import { 
  AppError, 
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  isOperationalError, 
  normalizeError
} from './errors.js';
import * as Sentry from '@sentry/node';
import { isProduction } from './secrets.js';

// Re-export error classes for convenience
export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError
};

/**
 * Error handler middleware
 * Must be added AFTER all routes
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Normalize error to AppError
  const appError = normalizeError(error);

  // Log error
  if (isOperationalError(appError)) {
    // Operational errors (expected) - log as info/warn
    logger.warn(`Operational error: ${appError.message}`, {
      code: appError.code,
      statusCode: appError.statusCode,
      path: req.path,
      method: req.method,
      details: appError.details
    });
  } else {
    // Programming errors (unexpected) - log as error and send to Sentry
    logger.error('Unexpected error', appError, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });

    // Send to Sentry for monitoring
    if (isProduction()) {
      Sentry.captureException(appError, {
        tags: {
          path: req.path,
          method: req.method
        },
        extra: {
          body: req.body,
          query: req.query,
          params: req.params
        }
      });
    }
  }

  // Send error response
  const statusCode = appError.statusCode || 500;
  const response = appError.toJSON();

  // Don't expose internal error details in production for non-operational errors
  if (!isOperationalError(appError) && process.env.NODE_ENV === 'production') {
    response.error.message = "Internal server error";
    delete response.error.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Async route handler wrapper
 * Automatically catches errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler (404)
 * Must be added AFTER all routes but BEFORE error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: "NOT_FOUND",
      statusCode: 404
    }
  });
}

