/**
 * Error Handling Utilities
 * 
 * Provides centralized error handling with retry logic and user-friendly messages
 */

import { QueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

/**
 * Error types
 */
export enum ErrorType {
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

/**
 * Structured error class
 */
export class AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  details?: unknown;

  constructor(message: string, type: ErrorType, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<AppError> {
  let message = "Произошла ошибка";
  let details: unknown;

  try {
    const data = await response.json();
    message = data.error || data.message || message;
    details = data;
  } catch {
    // Response is not JSON
    message = response.statusText || message;
  }

  // Determine error type
  let type = ErrorType.UNKNOWN;
  
  if (response.status === 401) {
    type = ErrorType.AUTHENTICATION;
    message = "Требуется авторизация";
  } else if (response.status === 403) {
    type = ErrorType.AUTHORIZATION;
    message = "Недостаточно прав";
  } else if (response.status === 404) {
    type = ErrorType.NOT_FOUND;
    message = "Ресурс не найден";
  } else if (response.status === 422 || response.status === 400) {
    type = ErrorType.VALIDATION;
  } else if (response.status >= 500) {
    type = ErrorType.SERVER;
    message = "Ошибка сервера";
  }

  return new AppError(message, type, response.status, details);
}

/**
 * Parse general error
 */
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check if it's a network error
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return new AppError("Ошибка сети. Проверьте подключение к интернету.", ErrorType.NETWORK);
    }

    return new AppError(error.message, ErrorType.UNKNOWN);
  }

  return new AppError("Неизвестная ошибка", ErrorType.UNKNOWN);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: "Проблемы с подключением к интернету",
    [ErrorType.VALIDATION]: error.message || "Проверьте введенные данные",
    [ErrorType.AUTHENTICATION]: "Необходимо войти в систему",
    [ErrorType.AUTHORIZATION]: "У вас нет доступа к этому ресурсу",
    [ErrorType.NOT_FOUND]: "Запрашиваемый ресурс не найден",
    [ErrorType.SERVER]: "Ошибка сервера. Попробуйте позже.",
    [ErrorType.UNKNOWN]: "Что-то пошло не так",
  };

  return messages[error.type] || error.message;
}

/**
 * Show error toast
 */
export function showErrorToast(error: unknown, customMessage?: string) {
  const appError = error instanceof AppError ? error : parseError(error);
  const message = customMessage || getUserFriendlyMessage(appError);

  toast({
    title: "Ошибка",
    description: message,
    variant: "destructive",
  });

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error("Error:", appError);
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
};

/**
 * Exponential backoff delay
 */
function getRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if error should be retried
 */
function shouldRetry(error: AppError, config: RetryConfig): boolean {
  return config.retryableErrors.includes(error.type);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AppError;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = parseError(error);

      // Don't retry if not retryable or last attempt
      if (!shouldRetry(lastError, retryConfig) || attempt === retryConfig.maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      const delay = getRetryDelay(attempt, retryConfig);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Log retry attempt
      if (import.meta.env.DEV) {
        console.log(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
      }
    }
  }

  throw lastError!;
}

/**
 * React Query error retry function
 */
export function reactQueryRetryFn(failureCount: number, error: unknown): boolean {
  const appError = parseError(error);

  // Don't retry authentication/authorization errors
  if (
    appError.type === ErrorType.AUTHENTICATION ||
    appError.type === ErrorType.AUTHORIZATION ||
    appError.type === ErrorType.VALIDATION ||
    appError.type === ErrorType.NOT_FOUND
  ) {
    return false;
  }

  // Retry network and server errors up to 3 times
  return failureCount < 3;
}

/**
 * Global error handler
 */
export function setupGlobalErrorHandler(queryClient: QueryClient) {
  // Handle React Query errors globally
  queryClient.setDefaultOptions({
    queries: {
      retry: reactQueryRetryFn,
      // Note: onError is deprecated in React Query v5, use error boundaries instead
    },
    mutations: {
      onError: (error) => {
        showErrorToast(error);
      },
    },
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();
  });
}

/**
 * Network status monitoring
 */
export class NetworkMonitor {
  private online: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    this.online = true;
    this.notify();
    
    toast({
      title: "Соединение восстановлено",
      description: "Вы снова онлайн",
    });
  };

  private handleOffline = () => {
    this.online = false;
    this.notify();
    
    toast({
      title: "Нет соединения",
      description: "Проверьте подключение к интернету",
      variant: "destructive",
    });
  };

  private notify() {
    this.listeners.forEach((listener) => listener(this.online));
  }

  public isOnline(): boolean {
    return this.online;
  }

  public subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.listeners.clear();
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(networkMonitor.isOnline());

  React.useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
}

// Note: Import React for the hook
import React from "react";

