// Middleware безопасности

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Настройки безопасности с помощью Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''], // Разрешаем для разработки
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\'', 'https://api.telegram.org'],
      frameSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Отключаем для совместимости
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Rate limiting для API
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10000, // максимум 10000 запросов за 15 минут (увеличено для разработки)
  message: {
    error: 'Too many requests',
    message: 'Слишком много запросов. Попробуйте позже.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Пропускаем health check endpoints
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Строгий rate limiting для аутентификации
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток входа за 15 минут
  message: {
    error: 'Too many authentication attempts',
    message: 'Слишком много попыток входа. Попробуйте позже.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не учитываем успешные запросы
});

/**
 * Rate limiting для регистрации
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 регистрации в час
  message: {
    error: 'Too many registration attempts',
    message: 'Слишком много попыток регистрации. Попробуйте позже.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware для проверки размера запроса
 */
export const requestSizeLimit = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Размер запроса превышает допустимый лимит',
      });
    }

    next();
  };
};

/**
 * Middleware для проверки IP адреса
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP || '')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Доступ запрещен с данного IP адреса',
      });
    }

    next();
  };
};

/**
 * Middleware для логирования подозрительной активности
 */
export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /eval/i,
    /expression/i,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
  ];

  const checkSuspicious = (data: unknown): boolean => {
    if (typeof data === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(data));
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return Object.values(obj).some(checkSuspicious);
    }

    return false;
  };

  // Проверяем тело запроса, параметры и заголовки
  if (
    checkSuspicious(req.body) ||
    checkSuspicious(req.query) ||
    checkSuspicious(req.params)
  ) {
    console.warn('Suspicious activity detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
