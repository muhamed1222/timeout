import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for error tracking in production
 * 
 * Set VITE_SENTRY_DSN environment variable to enable Sentry
 */
export function initSentry(): void {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  // Only initialize in production or if DSN is explicitly set
  if (!sentryDsn) {
    if (import.meta.env.PROD) {
      console.warn("VITE_SENTRY_DSN not set - error tracking disabled");
    }
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,
      
      // Integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      
      // Session Replay
      replaysSessionSampleRate: environment === "production" ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      
      // Release tracking
      release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || "development",
      
      // Configure what to send
      beforeSend(event: any, hint: any) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
        }
        
        // Don't send errors in development
        if (environment === "development") {
          console.error("Sentry captured error (not sent in dev)", hint.originalException);
          return null;
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection",
        "Network request failed",
        "Failed to fetch",
        "NetworkError",
        "AbortError",
      ],
    });

    console.log("Sentry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Sentry", error);
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
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info"): void {
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

/**
 * Sentry Error Boundary Component
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

export { Sentry };

