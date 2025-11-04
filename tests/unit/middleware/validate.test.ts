/**
 * Unit tests for validation middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../../server/middleware/validate.js';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('validateBody', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    it('should call next() when validation passes', async () => {
      mockRequest.body = { name: 'John', age: 25 };
      
      const middleware = validateBody(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when validation fails', async () => {
      mockRequest.body = { name: '', age: -1 };
      
      const middleware = validateBody(schema);
      
      await expect(
        middleware(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for missing required fields', async () => {
      mockRequest.body = {};
      
      const middleware = validateBody(schema);
      
      await expect(
        middleware(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow();

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    it('should call next() when validation passes', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      
      const middleware = validateParams(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when validation fails', async () => {
      mockRequest.params = { id: 'invalid-uuid' };
      
      const middleware = validateParams(schema);
      
      await expect(
        middleware(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow();

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should call next() when validation passes', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      
      const middleware = validateQuery(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle empty query', async () => {
      mockRequest.query = {};
      
      const middleware = validateQuery(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
