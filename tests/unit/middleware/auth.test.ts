/**
 * Unit tests for auth middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, requireCompanyAccess } from '../../../server/middleware/auth.js';

// Mock dependencies BEFORE importing anything
vi.mock('../../../server/repositories/index.js', () => ({
  repositories: {},
}));

vi.mock('../../../server/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { supabaseAdmin } from '../../../server/lib/supabase.js';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      headers: {},
      params: {},
      body: {},
      user: undefined,
      employee: undefined,
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  describe('requireAuth', () => {
    it('should return 401 if authorization header is missing', async () => {
      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers = { authorization: 'Invalid token' };

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' } as any,
      });

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no company_id', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            user_metadata: {},
          } as any,
        },
        error: null,
      });

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not associated with a company' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next on success', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            user_metadata: {
              company_id: 'company-1',
              role: 'admin',
            },
          } as any,
        },
        error: null,
      });

      await requireAuth(req as Request, res as Response, next);

      expect(req.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use default role if not provided', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            user_metadata: {
              company_id: 'company-1',
            },
          } as any,
        },
        error: null,
      });

      await requireAuth(req as Request, res as Response, next);

      expect(req.user?.role).toBe('admin');
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors and return 500', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(supabaseAdmin.auth.getUser).mockRejectedValue(new Error('Database error'));

      await requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 401 if user is not authenticated', () => {
      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not admin or owner', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'employee',
      };

      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user is admin', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      };

      requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if user is owner', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'owner',
      };

      requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireCompanyAccess', () => {
    it('should return 401 if user is not authenticated', () => {
      requireCompanyAccess(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if company ID is not provided', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      };

      requireCompanyAccess(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Company ID not provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user tries to access different company', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      };
      req.params = { companyId: 'company-2' };

      requireCompanyAccess(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied to this company' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user accesses their own company (from params)', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      };
      req.params = { companyId: 'company-1' };

      requireCompanyAccess(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if user accesses their own company (from body)', () => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        companyId: 'company-1',
        role: 'admin',
      };
      req.body = { company_id: 'company-1' };

      requireCompanyAccess(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
