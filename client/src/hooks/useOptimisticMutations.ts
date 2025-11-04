/**
 * Optimistic mutation hooks for common operations
 * 
 * Provides ready-to-use mutations with optimistic updates
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { optimisticAdd, optimisticRemove, optimisticUpdateItem, generateTempId, replaceTempId } from "@/lib/optimisticUpdates";
import type { Employee, EmployeeInvite } from "@shared/types";

/**
 * Optimistic mutation for creating an employee invite
 */
export function useOptimisticCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { company_id: string; full_name: string; position: string }) => {
      const response = await fetch("/api/employee-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка создания инвайта");
      }

      return response.json() as Promise<EmployeeInvite>;
    },
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["/api/companies", variables.company_id, "employee-invites"],
      });

      // Snapshot previous value
      const previousInvites = queryClient.getQueryData<EmployeeInvite[]>([
        "/api/companies",
        variables.company_id,
        "employee-invites",
      ]);

      // Optimistically add new invite
      const tempId = generateTempId();
      const optimisticInvite: EmployeeInvite = {
        id: tempId,
        company_id: variables.company_id,
        full_name: variables.full_name,
        position: variables.position,
        code: `temp_${tempId}`,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
      };

      optimisticAdd(queryClient, ["/api/companies", variables.company_id, "employee-invites"], optimisticInvite);

      return { previousInvites, tempId, companyId: variables.company_id };
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousInvites !== undefined && context?.companyId) {
        queryClient.setQueryData(
          ["/api/companies", context.companyId, "employee-invites"],
          context.previousInvites,
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      // Replace temp ID with real ID
      if (context?.tempId && context?.companyId) {
        replaceTempId(
          queryClient,
          ["/api/companies", context.companyId, "employee-invites"],
          context.tempId,
          data.id,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/companies", variables.company_id, "employee-invites"],
      });
    },
  });
}

/**
 * Optimistic mutation for deleting an invite
 */
export function useOptimisticDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(`/api/employee-invites/${inviteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить приглашение");
      }

      return response;
    },
    onMutate: async (inviteId) => {
      // Find which query key contains this invite
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll();
      
      for (const query of queries) {
        const data = query.state.data as EmployeeInvite[] | undefined;
        if (Array.isArray(data) && data.some(inv => inv.id === inviteId)) {
          await queryClient.cancelQueries({ queryKey: query.queryKey });
          
          const previousInvites = query.state.data as EmployeeInvite[] | undefined;
          
          // Optimistically remove
          optimisticRemove(queryClient, query.queryKey, inviteId);
          
          return { previousInvites, queryKey: query.queryKey };
        }
      }

      return null;
    },
    onError: (_error, _inviteId, context) => {
      // Rollback
      if (context?.previousInvites !== undefined && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousInvites);
      }
    },
    onSettled: () => {
      // Invalidate all invite queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some((key) => key === "employee-invites"),
      });
    },
  });
}

/**
 * Optimistic mutation for deleting an employee
 */
export function useOptimisticDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить сотрудника");
      }

      return response;
    },
    onMutate: async (employeeId) => {
      // Find which query key contains this employee
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll();
      
      for (const query of queries) {
        const data = query.state.data as Employee[] | undefined;
        if (Array.isArray(data) && data.some(emp => emp.id === employeeId)) {
          await queryClient.cancelQueries({ queryKey: query.queryKey });
          
          const previousEmployees = query.state.data as Employee[] | undefined;
          
          // Optimistically remove
          optimisticRemove(queryClient, query.queryKey, employeeId);
          
          return { previousEmployees, queryKey: query.queryKey };
        }
      }

      return null;
    },
    onError: (_error, _employeeId, context) => {
      // Rollback
      if (context?.previousEmployees !== undefined && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousEmployees);
      }
    },
    onSettled: () => {
      // Invalidate all employee queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey.includes("employees") ||
           query.queryKey.includes("employee-invites")),
      });
    },
  });
}



