/**
 * Unit tests for sanitization middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../../../server/middleware/sanitize.js';

describe('Sanitization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {};
    mockNext = vi.fn();
  });

  it('should sanitize strings in request body', () => {
    mockRequest.body = {
      name: '<script>alert("xss")</script>Hello',
      description: 'Normal text',
      age: 25,
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body.name).not.toContain('<script>');
    expect(mockRequest.body.description).toBe('Normal text');
    expect(mockRequest.body.age).toBe(25);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize strings in nested objects', () => {
    mockRequest.body = {
      user: {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
      },
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body.user.name).not.toContain('<script>');
    expect(mockRequest.body.user.email).toBe('john@example.com');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize strings in arrays', () => {
    mockRequest.body = {
      tags: ['<script>alert("xss")</script>tag1', 'normal tag'],
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body.tags[0]).not.toContain('<script>');
    expect(mockRequest.body.tags[1]).toBe('normal tag');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize query parameters', () => {
    mockRequest.query = {
      search: '<script>alert("xss")</script>test',
      page: '1',
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.query.search).not.toContain('<script>');
    expect(mockRequest.query.page).toBe('1');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize URL parameters', () => {
    mockRequest.params = {
      id: '123<script>alert("xss")</script>',
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.params.id).not.toContain('<script>');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle null and undefined values', () => {
    mockRequest.body = {
      name: null,
      description: undefined,
      age: 25,
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body.name).toBeNull();
    expect(mockRequest.body.description).toBeUndefined();
    expect(mockRequest.body.age).toBe(25);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should preserve non-string values', () => {
    mockRequest.body = {
      number: 42,
      boolean: true,
      date: new Date('2025-01-01'),
      array: [1, 2, 3],
    };

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body.number).toBe(42);
    expect(mockRequest.body.boolean).toBe(true);
    expect(mockRequest.body.date).toBeInstanceOf(Date);
    expect(mockRequest.body.array).toEqual([1, 2, 3]);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle empty objects', () => {
    mockRequest.body = {};

    sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.body).toEqual({});
    expect(mockNext).toHaveBeenCalled();
  });
});
