import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { httpIntegration, expressIntegration } from '@sentry/node';
import { logger } from './logger.js';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  // Only initialize in production or if DSN is explicitly provided
  if (process.env.NODE_ENV !== 'production' && !dsn) {
    logger.info('Sentry not initialized (development mode)');
    return;
  }
  
  if (!dsn) {
    logger.warn('SENTRY_DSN not set, error tracking disabled');
    return;
  }
  
  Sentry.init({
    dsn,
    integrations: [
      nodeProfilingIntegration(),
      httpIntegration(),
      expressIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    
    // Server name for grouping
    serverName: process.env.VERCEL_REGION || 'local',
    
    // Breadcrumbs
    maxBreadcrumbs: 50,
    
    // Ignore certain errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'AbortError',
    ],
    
    // Enhanced context and filtering
    beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
      // Add custom context
      if (event.request) {
        event.request.cookies = undefined; // Remove cookies for privacy
      }
      
      // Filter out sensitive data
      if (event.extra) {
        delete (event.extra as Record<string, unknown>).password;
        delete (event.extra as Record<string, unknown>).token;
        delete (event.extra as Record<string, unknown>).api_key;
      }
      
      // Don't send health check events
      if (event.transaction?.includes('/health')) {
        return null;
      }
      
      return event;
    },
  });
  
  logger.info('Sentry initialized', {
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}

/**
 * Capture exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    logger.error('Exception captured', { error, context });
  }
}

/**
 * Capture message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, level);
  } else {
    logger.info('Message captured', { message, level });
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Flush Sentry events (use on shutdown)
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  await Sentry.close(timeout);
}

export { Sentry };

