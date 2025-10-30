import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger.js";

/**
 * Initialize Sentry for error tracking in production
 * 
 * Set SENTRY_DSN environment variable to enable Sentry
 */
export function initSentry(): void {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!sentryDsn) {
    if (environment === 'production') {
      logger.warn('SENTRY_DSN not set - error tracking disabled in production');
    } else {
      logger.debug('SENTRY_DSN not set - running without error tracking');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,
      
      // Set sample rates
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Integrations
      integrations: [
        nodeProfilingIntegration(),
      ],
      
      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || 'development',
      
      // Configure what to send
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        
        // Don't send errors in development
        if (environment === 'development') {
          logger.error('Sentry captured error (not sent in dev)', hint.originalException);
          return null;
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'NetworkError',
        'Non-Error promise rejection',
      ],
    });

    logger.info('Sentry initialized successfully', {
      environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', error);
  }
}

/**
 * Capture an exception in Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb to Sentry
 */
export function addBreadcrumb(breadcrumb: { message: string; category?: string; level?: Sentry.SeverityLevel; data?: Record<string, any> }): void {
  Sentry.addBreadcrumb(breadcrumb);
}

export { Sentry };
