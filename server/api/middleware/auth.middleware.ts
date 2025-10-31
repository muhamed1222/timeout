// Middleware для аутентификации

import { Request, Response, NextFunction } from 'express';
import { isValidUUID } from '../../../shared/utils';
import { AuthService } from '../../services/auth.service.js';
import { supabaseAdmin } from '../../lib/supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    company_id: string;
    role: 'admin' | 'employee';
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Токен доступа не предоставлен',
      });
    }

    const token = authHeader.substring(7);

    // Сначала пробуем проверить токен Supabase
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (data?.user && !error) {
        // Токен Supabase валидный
        const userId = data.user.id;
        const email = data.user.email || '';
        const companyId = data.user.user_metadata?.company_id || '';
        const role = data.user.user_metadata?.role || 'employee';
        
        req.user = {
          id: userId,
          email: email,
          company_id: companyId,
          role: role as 'admin' | 'employee',
        };
        
        return next();
      }
    } catch (supabaseError) {
      // Если не Supabase токен, пробуем собственный JWT
      console.log('Not a Supabase token, trying custom JWT');
    }

    // Валидация собственного JWT токена
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Недействительный токен доступа',
      });
    }

    // Проверка срока действия токена
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Токен истек',
      });
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      company_id: payload.companyId,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Ошибка аутентификации',
    });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Валидация JWT токена
      const payload = AuthService.verifyToken(token);
      if (payload && (!payload.exp || payload.exp >= Date.now() / 1000)) {
        req.user = {
          id: payload.userId,
          email: payload.email,
          company_id: payload.companyId,
          role: payload.role,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

export const validateCompanyAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const companyId = req.params.companyId;

  if (!companyId || !isValidUUID(companyId)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Некорректный ID компании',
    });
  }

  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Требуется аутентификация',
    });
  }

  // TODO: Check if user has access to this company
  if (req.user.company_id !== companyId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Нет доступа к данной компании',
    });
  }

  next();
};
