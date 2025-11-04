/**
 * Input sanitization middleware
 * Automatically sanitizes all user inputs to prevent XSS and SQL injection
 */

import { Request, Response, NextFunction } from "express";
import {
  sanitizeObject,
  deepSanitize,
  containsSqlInjection,
  containsXss,
  sanitizeForLike,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUuid,
} from "../lib/sanitize.js";
import { ValidationError } from "../lib/errorHandler.js";
import { logger } from "../lib/logger.js";

/**
 * Sanitize request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === "object") {
      // Check for SQL injection patterns first
      // Use a custom replacer to preserve Date objects
      const bodyString = JSON.stringify(req.body, (key, value) => {
        // Skip Date objects in SQL injection check - they're serialized differently
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      if (containsSqlInjection(bodyString)) {
        logger.warn("SQL injection pattern detected in request body", {
          path: req.path,
          ip: req.ip,
        });
        throw new ValidationError("Invalid input detected");
      }
      
      // Deep sanitize the body
      req.body = deepSanitize(req.body, {
        maxDepth: 10,
      });
    }
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error sanitizing request body", error);
    next(error);
  }
}

/**
 * Sanitize request query parameters
 */
export function sanitizeQuery(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.query && typeof req.query === "object") {
      const queryString = JSON.stringify(req.query);
      
      // Check for SQL injection patterns
      if (containsSqlInjection(queryString)) {
        logger.warn("SQL injection pattern detected in query params", {
          path: req.path,
          ip: req.ip,
        });
        throw new ValidationError("Invalid query parameters");
      }
      
      // Sanitize query parameters
      const sanitized: Record<string, unknown> = {};
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          const value = req.query[key];
          if (typeof value === "string") {
            sanitized[key] = sanitizeObject({ value }).value;
          } else {
            sanitized[key] = value;
          }
        }
      }
      req.query = sanitized as Request["query"];
    }
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error sanitizing query parameters", error);
    next(error);
  }
}

/**
 * Sanitize request path parameters
 */
export function sanitizeParams(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.params && typeof req.params === "object") {
      // Path parameters are usually UUIDs or IDs - validate them strictly
      const sanitized: Record<string, string> = {};
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          const value = req.params[key];
          
          // Special handling for common parameter types
          if (key.includes("id") || key.includes("Id") || key.includes("ID")) {
            // Try to sanitize as UUID first
            const uuid = sanitizeUuid(value);
            if (uuid) {
              sanitized[key] = uuid;
            } else {
              // If not UUID, sanitize as regular string but validate
              const sanitizedValue = sanitizeObject({ value }).value;
              if (containsSqlInjection(sanitizedValue) || containsXss(sanitizedValue)) {
                throw new ValidationError(`Invalid ${key} parameter`);
              }
              sanitized[key] = sanitizedValue;
            }
          } else {
            // Regular parameter sanitization
            const sanitizedValue = sanitizeObject({ value }).value;
            if (containsSqlInjection(sanitizedValue) || containsXss(sanitizedValue)) {
              throw new ValidationError(`Invalid ${key} parameter`);
            }
            sanitized[key] = sanitizedValue;
          }
        }
      }
      req.params = sanitized as Request["params"];
    }
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error("Error sanitizing path parameters", error);
    next(error);
  }
}

/**
 * Comprehensive sanitization middleware
 * Sanitizes body, query, and params
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, () => {
      sanitizeParams(req, res, next);
    });
  });
}

/**
 * Sanitize specific fields in request body
 * Useful for fields that need special handling (email, phone, etc.)
 */
export function sanitizeFields(fieldMappings: Record<string, (value: unknown) => unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.body && typeof req.body === "object") {
        for (const field in fieldMappings) {
          if (req.body[field] !== undefined) {
            req.body[field] = fieldMappings[field](req.body[field]);
          }
        }
      }
      next();
    } catch (error) {
      logger.error("Error sanitizing specific fields", error);
      next(error);
    }
  };
}

// Export utility functions for use in routes
export {
  sanitizeForLike,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUuid,
  containsSqlInjection,
  containsXss,
};


