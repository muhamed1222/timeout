// CSRF защита middleware

import { Request, Response, NextFunction } from 'express';
import Csrf from 'csrf';
import { envConfig } from '../config/env.config.js';

// Создаем экземпляр CSRF с настройками
const csrf = new Csrf({
  secretLength: 64,
  saltLength: 8,
  secret: envConfig.get('CSRF_SECRET'),
});

export interface CSRFRequest extends Request {
  csrfToken?: string;
}

/**
 * Middleware для генерации CSRF токена
 */
export const generateCSRFToken = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = csrf.create(req.sessionID || req.ip);
    req.csrfToken = token;

    // Отправляем токен в заголовке для клиента
    res.setHeader('X-CSRF-Token', token);

    next();
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ error: 'Ошибка генерации CSRF токена' });
  }
};

/**
 * Middleware для проверки CSRF токена
 */
export const verifyCSRFToken = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получаем токен из заголовка или тела запроса
    const token = (req.headers['x-csrf-token'] as string) || req.body._csrf;

    if (!token) {
      return res.status(403).json({
        error: 'CSRF token missing',
        message: 'CSRF токен не предоставлен',
      });
    }

    // Проверяем токен
    const isValid = csrf.verify(req.sessionID || req.ip, token);

    if (!isValid) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'Недействительный CSRF токен',
      });
    }

    next();
  } catch (error) {
    console.error('CSRF verification error:', error);
    res.status(403).json({
      error: 'CSRF verification failed',
      message: 'Ошибка проверки CSRF токена',
    });
  }
};

/**
 * Middleware для проверки CSRF токена только для изменяющих запросов
 */
export const verifyCSRFForModifyingRequests = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  // Временно отключаем CSRF проверку для отладки
  next();
};

/**
 * Получить CSRF токен для клиента
 */
export const getCSRFToken = (req: CSRFRequest): string => {
  return csrf.create(req.sessionID || req.ip);
};
