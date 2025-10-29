/**
 * Optimistic Updates Utilities for React Query
 * 
 * Provides helpers for implementing optimistic UI updates with automatic rollback on errors
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Generic optimistic update helper
 * 
 * @param queryClient - React Query client
 * @param queryKey - Query key to update
 * @param updater - Function to update the cached data
 * @returns Rollback function to restore previous data
 */
export function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: (oldData: T | undefined) => T
): () => void {
  // Cancel outgoing refetches
  queryClient.cancelQueries({ queryKey });
  
  // Snapshot the previous value
  const previousData = queryClient.getQueryData<T>(queryKey);
  
  // Optimistically update to the new value
  queryClient.setQueryData<T>(queryKey, (old) => updater(old));
  
  // Return rollback function
  return () => {
    if (previousData !== undefined) {
      queryClient.setQueryData(queryKey, previousData);
    }
  };
}

/**
 * Optimistically add an item to a list
 */
export function optimisticAdd<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newItem: T
): () => void {
  return optimisticUpdate<T[]>(queryClient, queryKey, (oldData = []) => {
    return [...oldData, newItem];
  });
}

/**
 * Optimistically update an item in a list
 */
export function optimisticUpdateItem<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string,
  updater: (item: T) => T
): () => void {
  return optimisticUpdate<T[]>(queryClient, queryKey, (oldData = []) => {
    return oldData.map((item) => 
      item.id === itemId ? updater(item) : item
    );
  });
}

/**
 * Optimistically remove an item from a list
 */
export function optimisticRemove<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string
): () => void {
  return optimisticUpdate<T[]>(queryClient, queryKey, (oldData = []) => {
    return oldData.filter((item) => item.id !== itemId);
  });
}

/**
 * Optimistically update a single entity
 */
export function optimisticUpdateEntity<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: (entity: T | undefined) => T
): () => void {
  return optimisticUpdate<T>(queryClient, queryKey, updater);
}

/**
 * Optimistic toggle for boolean properties
 */
export function optimisticToggle<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string,
  property: keyof T
): () => void {
  return optimisticUpdateItem<T>(queryClient, queryKey, itemId, (item) => ({
    ...item,
    [property]: !item[property],
  }));
}

/**
 * Higher-order mutation function with built-in optimistic updates
 */
export interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: unknown[];
  onOptimisticUpdate: (
    queryClient: QueryClient,
    variables: TVariables
  ) => () => void; // Returns rollback function
  invalidateQueries?: unknown[][]; // Additional queries to invalidate on success
}

export function createOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  onOptimisticUpdate,
  invalidateQueries = [],
}: OptimisticMutationOptions<TData, TVariables>) {
  return {
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Optimistic update returns rollback function
      const rollback = onOptimisticUpdate(
        queryClient,
        variables
      );
      
      return { rollback };
    },
    onError: (_error: Error, _variables: TVariables, context: any) => {
      // Rollback optimistic update
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSettled: async (_data: TData | undefined, _error: Error | null) => {
      // Refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey });
      
      // Invalidate additional queries
      for (const qk of invalidateQueries) {
        await queryClient.invalidateQueries({ queryKey: qk });
      }
    },
  };
}

/**
 * Generate temporary ID for optimistic items
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an ID is temporary
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

/**
 * Replace temporary ID with real ID after mutation succeeds
 */
export function replaceTempId<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  tempId: string,
  realId: string,
  updater?: (item: T) => T
): void {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.map((item) => {
      if (item.id === tempId) {
        const updated = { ...item, id: realId };
        return updater ? updater(updated as T) : updated;
      }
      return item;
    });
  });
}

// Note: queryClient needs to be imported in components using these utilities
// Example: import { queryClient } from '@/lib/queryClient';

