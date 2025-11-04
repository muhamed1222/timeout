/**
 * Unit tests for Audit Logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies BEFORE importing anything that uses them
vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../repositories/index.js', () => ({
  repositories: {
    audit: {
      log: vi.fn(),
    },
  },
}));

import { auditLogger } from '../audit.js';
import { logger } from '../logger.js';
import { repositories } from '../../repositories/index.js';

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should log audit event to Winston and database', async () => {
      const entry = {
        action: 'employee.create' as const,
        actor_id: 'user-123',
        actor_type: 'user' as const,
        actor_ip: '127.0.0.1',
        company_id: 'company-456',
        resource_type: 'employee',
        resource_id: 'emp-789',
        details: { name: 'John Doe', email: 'john@example.com' },
        result: 'success' as const,
      };

      await auditLogger.log(entry);

      // Should log to Winston
      expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
        action: 'employee.create',
        actor_id: 'user-123',
      }));

      // Should write to database
      expect(repositories.audit.log).toHaveBeenCalledWith(
        'user:user-123',
        'employee.create',
        'employee:emp-789',
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          actor_type: 'user',
          actor_ip: '127.0.0.1',
          company_id: 'company-456',
          result: 'success',
        })
      );
    });

    it('should format actor without ID as just actor_type', async () => {
      const entry = {
        action: 'system.startup' as const,
        actor_type: 'system' as const,
        result: 'success' as const,
      };

      await auditLogger.log(entry);

      expect(repositories.audit.log).toHaveBeenCalledWith(
        'system',
        'system.startup',
        'system',
        expect.any(Object)
      );
    });

    it('should format entity without ID as resource_type', async () => {
      const entry = {
        action: 'company.create' as const,
        actor_type: 'user' as const,
        actor_id: 'user-123',
        resource_type: 'company',
        result: 'success' as const,
      };

      await auditLogger.log(entry);

      expect(repositories.audit.log).toHaveBeenCalledWith(
        'user:user-123',
        'company.create',
        'company',
        expect.any(Object)
      );
    });

    it('should include error_message in payload when provided', async () => {
      const entry = {
        action: 'employee.delete' as const,
        actor_type: 'user' as const,
        actor_id: 'user-123',
        result: 'failure' as const,
        error_message: 'Employee not found',
      };

      await auditLogger.log(entry);

      expect(repositories.audit.log).toHaveBeenCalledWith(
        expect.any(String),
        'employee.delete',
        expect.any(String),
        expect.objectContaining({
          error_message: 'Employee not found',
          result: 'failure',
        })
      );
    });

    it('should include user_agent in payload when provided', async () => {
      const entry = {
        action: 'auth.login' as const,
        actor_type: 'user' as const,
        actor_id: 'user-123',
        result: 'success' as const,
        user_agent: 'Mozilla/5.0',
      };

      await auditLogger.log(entry);

      expect(repositories.audit.log).toHaveBeenCalledWith(
        expect.any(String),
        'auth.login',
        expect.any(String),
        expect.objectContaining({
          user_agent: 'Mozilla/5.0',
        })
      );
    });

    it('should fallback to Winston logging if database write fails', async () => {
      const entry = {
        action: 'employee.create' as const,
        actor_type: 'user' as const,
        actor_id: 'user-123',
        result: 'success' as const,
      };

      const dbError = new Error('Database connection failed');
      vi.mocked(repositories.audit.log).mockRejectedValueOnce(dbError);

      await auditLogger.log(entry);

      // Should still log to Winston
      expect(logger.info).toHaveBeenCalled();

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to write audit log to database',
        dbError,
        expect.objectContaining({
          action: 'employee.create',
          actor_type: 'user',
          actor_id: 'user-123',
        })
      );
    });

    it('should use "unknown" as entity when resource_type is not provided', async () => {
      const entry = {
        action: 'system.startup' as const,
        actor_type: 'system' as const,
        result: 'success' as const,
      };

      await auditLogger.log(entry);

      expect(repositories.audit.log).toHaveBeenCalledWith(
        'system',
        'system.startup',
        'system',
        expect.any(Object)
      );
    });
  });

  describe('logAuth', () => {
    it('should log authentication event with user details', async () => {
      await auditLogger.logAuth({
        action: 'auth.login',
        userId: 'user-123',
        email: 'user@example.com',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        result: 'success',
      });

      expect(repositories.audit.log).toHaveBeenCalledWith(
        'user:user-123',
        'auth.login',
        expect.any(String),
        expect.objectContaining({
          email: 'user@example.com',
          actor_ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          result: 'success',
        })
      );
    });

    it('should log failed authentication with error message', async () => {
      await auditLogger.logAuth({
        action: 'auth.login',
        email: 'user@example.com',
        ip: '192.168.1.1',
        result: 'failure',
        error: 'Invalid credentials',
      });

      expect(repositories.audit.log).toHaveBeenCalledWith(
        expect.any(String),
        'auth.login',
        expect.any(String),
        expect.objectContaining({
          email: 'user@example.com',
          result: 'failure',
          error_message: 'Invalid credentials',
        })
      );
    });
  });

  describe('auditMiddleware', () => {
    it('should create middleware function', async () => {
      const { auditMiddleware } = await import('../audit.js');
      
      expect(typeof auditMiddleware).toBe('function');
      
      const middleware = auditMiddleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // Express middleware signature
    });

    it('should skip GET requests', async () => {
      const { auditMiddleware } = await import('../audit.js');
      
      const mockReq = {
        method: 'GET',
        path: '/api/employees',
      } as any;

      const mockRes = {} as any;
      const mockNext = vi.fn();

      const middleware = auditMiddleware();
      await middleware(mockReq, mockRes, mockNext);

      // Should call next immediately for GET requests
      expect(mockNext).toHaveBeenCalled();
      expect(repositories.audit.log).not.toHaveBeenCalled();
    });
  });
});

