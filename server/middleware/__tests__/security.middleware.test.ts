/**
 * Unit tests for security middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requestSizeLimit, ipWhitelist, securityLogger } from '../security.middleware.js';

describe('Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1' as any,
      connection: { remoteAddress: '127.0.0.1' } as any,
      socket: { remoteAddress: '127.0.0.1' } as any,
      url: '/api/test',
      method: 'POST',
      get: vi.fn().mockReturnValue('Mozilla/5.0'),
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestSizeLimit', () => {
    it('should call next if content-length is within limit', () => {
      req.headers = { 'content-length': '1024' }; // 1KB
      const middleware = requestSizeLimit(1024 * 1024); // 1MB limit

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 413 if content-length exceeds limit', () => {
      req.headers = { 'content-length': '2097152' }; // 2MB
      const middleware = requestSizeLimit(1024 * 1024); // 1MB limit

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload too large',
        message: 'Размер запроса превышает допустимый лимит',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing content-length header', () => {
      req.headers = {};
      const middleware = requestSizeLimit(1024 * 1024);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use default limit if not specified', () => {
      req.headers = { 'content-length': '1024' };
      const middleware = requestSizeLimit();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('ipWhitelist', () => {
    it('should call next if IP is in whitelist', () => {
      (req as any).ip = '192.168.1.1';
      const middleware = ipWhitelist(['192.168.1.1', '10.0.0.1']);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if IP is not in whitelist', () => {
      (req as any).ip = '192.168.1.2';
      const middleware = ipWhitelist(['192.168.1.1', '10.0.0.1']);

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Доступ запрещен с данного IP адреса',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow all IPs if whitelist is empty', () => {
      (req as any).ip = '192.168.1.1';
      const middleware = ipWhitelist([]);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fallback to connection.remoteAddress if req.ip is not set', () => {
      (req as any).ip = undefined;
      req.connection = { remoteAddress: '192.168.1.1' } as any;
      const middleware = ipWhitelist(['192.168.1.1']);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fallback to socket.remoteAddress if req.ip and connection.remoteAddress are not set', () => {
      (req as any).ip = undefined;
      req.connection = { remoteAddress: undefined } as any;
      req.socket = { remoteAddress: '192.168.1.1' } as any;
      const middleware = ipWhitelist(['192.168.1.1']);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('securityLogger', () => {
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should call next if no suspicious patterns detected', () => {
      req.body = { name: 'John', email: 'john@example.com' };
      req.query = { page: '1' };
      req.params = { id: '123' };

      securityLogger(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log suspicious activity in request body', () => {
      req.body = { name: '<script>alert("xss")</script>' };
      vi.mocked(req.get!).mockReturnValue('Mozilla/5.0');

      securityLogger(req as Request, res as Response, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should log suspicious activity in query parameters', () => {
      req.query = { search: 'javascript:alert(1)' };
      vi.mocked(req.get!).mockReturnValue('Mozilla/5.0');

      securityLogger(req as Request, res as Response, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should log suspicious activity in path parameters', () => {
      req.params = { id: "1' OR '1'='1" };
      vi.mocked(req.get!).mockReturnValue('Mozilla/5.0');

      securityLogger(req as Request, res as Response, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should detect SQL injection patterns', () => {
      req.body = { query: "SELECT * FROM users WHERE id = 1; DROP TABLE users;" };
      vi.mocked(req.get!).mockReturnValue('Mozilla/5.0');

      securityLogger(req as Request, res as Response, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      req.body = {
        user: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
        },
      };
      vi.mocked(req.get!).mockReturnValue('Mozilla/5.0');

      securityLogger(req as Request, res as Response, next);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
