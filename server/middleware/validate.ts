/**
 * Validation middleware using Zod schemas
 * Integrated with standardized error handling
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../lib/errorHandler.js";

/**
 * Validates request body against a Zod schema
 * Throws ValidationError on failure (handled by error handler middleware)
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Validation failed", {
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * Throws ValidationError on failure (handled by error handler middleware)
 */
export function validateQuery<T extends Record<string, unknown>>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as unknown as Request["query"];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Query validation failed", {
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates request params against a Zod schema
 * Throws ValidationError on failure (handled by error handler middleware)
 */
export function validateParams<T extends Record<string, string>>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as unknown as Request["params"];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Path parameter validation failed", {
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates multiple parts of request (body, query, params)
 * Throws ValidationError on failure (handled by error handler middleware)
 */
export function validate<TBody = unknown, TQuery = Record<string, unknown>, TParams = Record<string, string>>(schemas: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      // Validate query if schema provided
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as unknown as Request["query"];
      }
      
      // Validate params if schema provided
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as unknown as Request["params"];
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Validation failed", {
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      next(error);
    }
  };
}

