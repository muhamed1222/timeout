import cors from 'cors';
import type { CorsOptions } from 'cors';
import { logger } from './logger.js';

/**
 * CORS Configuration
 * 
 * Configures Cross-Origin Resource Sharing for the API
 * Use ALLOWED_ORIGINS environment variable to whitelist domains
 */

/**
 * Get allowed origins from environment or defaults
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Default origins for development
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];
  }
  
  // In production, require explicit configuration
  logger.warn('ALLOWED_ORIGINS not set - CORS will block all origins in production');
  return [];
}

/**
 * Configure CORS middleware with security best practices
 */
export function configureCors() {
  const allowedOrigins = getAllowedOrigins();
  
  logger.info('CORS configured', {
    allowedOrigins,
    environment: process.env.NODE_ENV,
  });

  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) {
        if (process.env.ALLOW_NO_ORIGIN === 'true') {
          return callback(null, true);
        }
        // In production, log suspicious no-origin requests
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Request with no origin blocked', { origin });
        }
        return callback(null, true); // Allow for development
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // In development, allow all origins with warning
        logger.warn('Origin not in whitelist but allowed in development', { origin });
        callback(null, true);
      } else {
        // In production, block unauthorized origins
        logger.warn('CORS blocked request from unauthorized origin', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    
    // Allow credentials (cookies, auth headers)
    credentials: true,
    
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    
    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-telegram-init-data', // Telegram WebApp auth
    ],
    
    // Exposed headers (client can access)
    exposedHeaders: [
      'Content-Length',
      'Content-Type',
      'X-Request-ID',
    ],
    
    // Preflight cache time (10 minutes)
    maxAge: 600,
    
    // Pass CORS preflight response to next handler
    preflightContinue: false,
    
    // Provide success status for OPTIONS requests
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get list of allowed origins (for debugging)
 */
export function getConfiguredOrigins(): string[] {
  return getAllowedOrigins();
}

