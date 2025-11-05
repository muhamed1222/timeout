/**
 * Express Error Handler Middleware
 *
 * Standardizes error handling across all routes
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
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
  normalizeError,
} from "./errors.js";
import * as Sentry from "@sentry/node";
import { isProduction } from "./secrets.js";

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
  DatabaseError,
};

/**
 * Error handler middleware
 * Must be added AFTER all routes
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Normalize error to AppError
  const appError = normalizeError(error);

  // Log error with context
  const errorContext = {
    code: appError.code,
    statusCode: appError.statusCode,
    path: req.path,
    method: req.method,
    userId:
      (
        (req as unknown as Record<string, unknown>).user as Record<
          string,
          unknown
        >
      )?.id ?? (req as unknown as Record<string, unknown>).userId,
    companyId:
      (req as unknown as Record<string, unknown>).companyId ??
      req.params?.companyId ??
      req.body?.company_id,
    ip:
      req.ip ?? req.headers["x-forwarded-for"] ?? req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
  };

  if (isOperationalError(appError)) {
    // Operational errors (expected) - log as info/warn
    logger.warn(`Operational error: ${appError.message}`, {
      ...errorContext,
      details: appError.details,
    });
  } else {
    // Programming errors (unexpected) - log as error and send to Sentry
    logger.error("Unexpected error", appError, {
      ...errorContext,
      body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    });

    // Send to Sentry for monitoring
    if (isProduction()) {
      Sentry.captureException(appError, {
        tags: {
          path: req.path,
          method: req.method,
        },
        extra: {
          body: req.body,
          query: req.query,
          params: req.params,
        },
      });
    }
  }

  // Send error response
  const statusCode = appError.statusCode ?? 500;
  const response = appError.toJSON();

  // Don't expose internal error details in production for non-operational errors
  if (!isOperationalError(appError) && process.env.NODE_ENV === "production") {
    const errorObj = response.error as Record<string, unknown>;
    errorObj.message = "Internal server error";
    delete errorObj.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Async route handler wrapper
 * Automatically catches errors and passes them to error handler
 */
type AsyncRouteHandler = (
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => Promise<void | Response>;
type SyncRouteHandler = (
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => void;

export function asyncHandler(fn: AsyncRouteHandler): SyncRouteHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler (404)
 * Must be added AFTER all routes but BEFORE error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: "NOT_FOUND",
      statusCode: 404,
    },
  });
}
