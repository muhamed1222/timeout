/**
 * Retry Hook for Failed Queries
 * 
 * Provides retry functionality for React Query with exponential backoff
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "./use-toast";

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

/**
 * Hook for retrying failed queries
 */
export function useRetry(queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(
    async (options: RetryOptions = {}) => {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        onRetry,
        onSuccess,
        onFailure,
      } = options;

      if (isRetrying) {
        return;
      }

      setIsRetrying(true);
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          attempt++;
          setRetryCount(attempt);

          onRetry?.(attempt);

          // Cancel any ongoing queries
          await queryClient.cancelQueries({ queryKey });

          // Refetch the query
          await queryClient.refetchQueries({ queryKey });

          // If successful, break the loop
          const data = queryClient.getQueryData(queryKey);
          if (data !== undefined) {
            setIsRetrying(false);
            setRetryCount(0);
            onSuccess?.();
            toast({
              title: "Данные обновлены",
              description: "Повторная попытка успешна",
            });
            return;
          }

          // If still no data, wait before next retry
          if (attempt < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * attempt),
            );
          }
        } catch (error) {
          if (attempt >= maxRetries) {
            setIsRetrying(false);
            setRetryCount(0);
            const err = error instanceof Error ? error : new Error("Unknown error");
            onFailure?.(err);
            toast({
              title: "Ошибка",
              description: `Не удалось загрузить данные после ${maxRetries} попыток`,
              variant: "destructive",
            });
            throw err;
          }

          // Wait before next retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * 2 ** attempt),
          );
        }
      }

      setIsRetrying(false);
      setRetryCount(0);
    },
    [queryClient, queryKey, isRetrying],
  );

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return {
    retry,
    isRetrying,
    retryCount,
    reset,
  };
}

/**
 * Hook for retrying multiple queries
 */
export function useRetryMultiple(queryKeys: unknown[][]) {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  const retryAll = useCallback(
    async (options: RetryOptions = {}) => {
      const { maxRetries = 3, onSuccess, onFailure } = options;

      if (isRetrying) {
        return;
      }

      setIsRetrying(true);

      try {
        // Cancel all queries
        for (const queryKey of queryKeys) {
          await queryClient.cancelQueries({ queryKey });
        }

        // Refetch all queries
        await Promise.all(
          queryKeys.map((queryKey) =>
            queryClient.refetchQueries({ queryKey }),
          ),
        );

        setIsRetrying(false);
        onSuccess?.();
        toast({
          title: "Данные обновлены",
          description: "Все данные успешно загружены",
        });
      } catch (error) {
        setIsRetrying(false);
        const err = error instanceof Error ? error : new Error("Unknown error");
        onFailure?.(err);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить некоторые данные",
          variant: "destructive",
        });
        throw err;
      }
    },
    [queryClient, queryKeys, isRetrying],
  );

  return {
    retryAll,
    isRetrying,
  };
}



