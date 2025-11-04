/**
 * Компонент границы ошибок
 * Перехватывает ошибки React и отображает fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    // Clear localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear cache:", error);
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full p-6 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Что-то пошло не так</h2>
              <p className="text-muted-foreground">
                Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Показать детали
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleReload}>
                  Обновить страницу
                </Button>
                <Button onClick={this.handleReset}>
                  Вернуться на главную
                </Button>
              </div>
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleClearCache}
                  className="text-muted-foreground"
                >
                  Очистить кэш и обновить
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Компонент для отображения ошибок загрузки данных
export function ErrorState({ 
  message = "Не удалось загрузить данные",
  onRetry, 
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <AlertCircle className="w-12 h-12 text-destructive" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Ошибка</h3>
        <p className="text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Попробовать снова
        </Button>
      )}
    </div>
  );
}

// Компонент для пустых состояний
export function EmptyState({ 
  message = "Нет данных для отображения",
  icon: Icon = AlertCircle,
}: { 
  message?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <Icon className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

