import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/"), {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

/**
 * Query configuration presets for different data types
 */
export const queryConfig = {
  // Static/reference data (companies, settings) - rarely changes
  static: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Employee data - changes occasionally
  employees: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: "always" as const,
  },
  
  // Live data (shifts, stats) - changes frequently
  live: {
    staleTime: 1000 * 30, // 30 seconds
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 30, // 30 seconds background refetch
    refetchOnWindowFocus: true,
  },
  
  // Dashboard stats - real-time updates needed
  dashboard: {
    staleTime: 1000 * 15, // 15 seconds
    cacheTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 15, // 15 seconds for live dashboard
    refetchOnWindowFocus: true,
  },
  
  // Rating data - changes infrequently but needs to be fresh
  ratings: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
  },
  
  // User settings - rarely changes
  settings: {
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 1000 * 60 * 5, // Default: 5 minutes
      cacheTime: 1000 * 60 * 10, // Default: 10 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: "always" as const,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && "status" in error) {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Mutations should not retry automatically
      onError: (error) => {
        // Global error handling for mutations
        console.error("Mutation error:", error);
      },
    },
  },
});
