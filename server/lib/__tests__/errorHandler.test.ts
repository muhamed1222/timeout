/**
 * Unit tests for error handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError, asyncHandler } from '../errorHandler.js';

describe('Error Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('NotFoundError', () => {
    it('should create error with message', () => {
      const error = new NotFoundError('Resource');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should be instance of Error', () => {
      const error = new NotFoundError('Resource');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should be instance of Error', () => {
      const error = new ValidationError('Invalid input');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('asyncHandler', () => {
    it('should call handler function and pass through', async () => {
      const handler = vi.fn(async (req, res, next) => {
        res.status(200).json({ success: true });
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(handler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Test error');
      const handler = vi.fn(async () => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle NotFoundError correctly', async () => {
      const error = new NotFoundError('Resource');
      const handler = vi.fn(async () => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle ValidationError correctly', async () => {
      const error = new ValidationError('Invalid input');
      const handler = vi.fn(async () => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle promise rejection', async () => {
      const error = new Error('Promise rejected');
      const handler = vi.fn(async () => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Wait a bit for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
