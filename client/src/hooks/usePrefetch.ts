/**
 * Prefetching hooks for React Query
 * 
 * Prefetch data before user navigates to improve perceived performance
 */

import { useQueryClient } from "@tanstack/react-query";
import { queryConfig } from "@/lib/queryClient";
import { useCallback } from "react";

/**
 * Prefetch employee data on hover
 */
export function usePrefetchEmployee() {
  const queryClient = useQueryClient();

  return useCallback(
    (employeeId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["/api/employees", employeeId],
        queryFn: async () => {
          const res = await fetch(`/api/employees/${employeeId}`, {
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error("Failed to fetch employee");
          }
          return res.json();
        },
        staleTime: queryConfig.employees.staleTime,
      });
    },
    [queryClient],
  );
}

/**
 * Prefetch employee stats on hover
 */
export function usePrefetchEmployeeStats() {
  const queryClient = useQueryClient();

  return useCallback(
    (employeeId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["/api/employees", employeeId, "stats"],
        queryFn: async () => {
          const res = await fetch(`/api/employees/${employeeId}/stats`, {
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error("Failed to fetch stats");
          }
          return res.json();
        },
        staleTime: queryConfig.live.staleTime,
      });
    },
    [queryClient],
  );
}

/**
 * Prefetch company data when user might navigate to company settings
 */
export function usePrefetchCompany() {
  const queryClient = useQueryClient();

  return useCallback(
    (companyId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["/api/companies", companyId],
        queryFn: async () => {
          const res = await fetch(`/api/companies/${companyId}`, {
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error("Failed to fetch company");
          }
          return res.json();
        },
        staleTime: queryConfig.static.staleTime,
      });
    },
    [queryClient],
  );
}

/**
 * Prefetch shifts for a specific employee
 */
export function usePrefetchEmployeeShifts() {
  const queryClient = useQueryClient();

  return useCallback(
    (employeeId: string, startDate?: string, endDate?: string) => {
      const queryKey = [
        "/api/shifts",
        employeeId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ];

      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const params = new URLSearchParams();
          if (startDate) {
            params.set("start", startDate);
          }
          if (endDate) {
            params.set("end", endDate);
          }

          const url = `/api/shifts?employee_id=${employeeId}${
            params.toString() ? `&${params.toString()}` : ""
          }`;
          const res = await fetch(url, {
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error("Failed to fetch shifts");
          }
          return res.json();
        },
        staleTime: queryConfig.live.staleTime,
      });
    },
    [queryClient],
  );
}

/**
 * Prefetch ratings for a company
 */
export function usePrefetchRatings() {
  const queryClient = useQueryClient();

  return useCallback(
    (companyId: string, periodStart?: string, periodEnd?: string) => {
      const queryKey = [
        "/api/companies",
        companyId,
        "ratings",
        ...(periodStart ? [periodStart] : []),
        ...(periodEnd ? [periodEnd] : []),
      ];

      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const params = new URLSearchParams();
          if (periodStart) {
            params.set("periodStart", periodStart);
          }
          if (periodEnd) {
            params.set("periodEnd", periodEnd);
          }

          const url = `/api/companies/${companyId}/ratings${
            params.toString() ? `?${params.toString()}` : ""
          }`;
          const res = await fetch(url, {
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error("Failed to fetch ratings");
          }
          return res.json();
        },
        staleTime: queryConfig.ratings.staleTime,
      });
    },
    [queryClient],
  );
}

/**
 * Generic prefetch hook that accepts custom query key and function
 */
export function usePrefetch<TData = unknown>() {
  const queryClient = useQueryClient();

  return useCallback(
    (
      queryKey: unknown[],
      queryFn: () => Promise<TData>,
      options?: {
        staleTime?: number;
        cacheTime?: number;
      },
    ) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: options?.staleTime,
      });
    },
    [queryClient],
  );
}



