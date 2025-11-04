/**
 * Standardized Error Handling System
 * 
 * Provides custom error classes and error handling utilities
 * for consistent error responses across the API.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: Record<string, any>,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code || this.name,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * 400 Bad Request - Invalid input data
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, any>,
  ) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * 403 Forbidden - Access denied
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND", { resource });
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", details?: Record<string, any>) {
    super(message, 409, "CONFLICT", details);
  }
}

/**
 * 422 Unprocessable Entity - Business logic error
 */
export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>,
  ) {
    super(message, 422, "BUSINESS_LOGIC_ERROR", details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = "Internal server error",
    details?: Record<string, any>,
  ) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details, false);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    originalError?: Error,
    details?: Record<string, any>,
  ) {
    super(
      message,
      500,
      "DATABASE_ERROR",
      {
        ...details,
        ...(originalError && { originalError: originalError.message }),
      },
      false,
    );
  }
}

/**
 * Check if error is an operational (expected) error
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Database errors
    if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
      return new ConflictError("Resource already exists", { originalError: error.message });
    }

    if (error.message.includes("foreign key") || error.message.includes("violates foreign key")) {
      return new ValidationError("Invalid reference", { originalError: error.message });
    }

    if (error.message.includes("not found") || error.message.includes("does not exist")) {
      return new NotFoundError();
    }

    // Generic error
    return new InternalServerError(error.message, { originalError: error.message });
  }

  // Unknown error type
  return new InternalServerError("An unexpected error occurred");
}



