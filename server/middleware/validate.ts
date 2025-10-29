/**
 * Validation middleware using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../lib/logger.js';

/**
 * Validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error (body)', {
          path: req.path,
          method: req.method,
          errors,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 */
export function validateQuery<T extends Record<string, unknown>>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error (query)', {
          path: req.path,
          method: req.method,
          errors,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates request params against a Zod schema
 */
export function validateParams<T extends Record<string, string>>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as unknown as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error (params)', {
          path: req.path,
          method: req.method,
          errors,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      next(error);
    }
  };
}

/**
 * Validates multiple parts of request (body, query, params)
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
        req.query = await schemas.query.parseAsync(req.query) as unknown as Request['query'];
      }
      
      // Validate params if schema provided
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as unknown as Request['params'];
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error', {
          path: req.path,
          method: req.method,
          errors,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      next(error);
    }
  };
}

