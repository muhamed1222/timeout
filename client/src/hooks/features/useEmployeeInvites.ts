/**
 * Хук для работы с приглашениями сотрудников
 */

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryConfig } from "@/lib/queryClient";
import type { EmployeeInvite, InviteLink } from "@/types";

/**
 * Опции для хука useEmployeeInvites
 */
export interface UseEmployeeInvitesOptions {
  /** Автоматическое обновление данных */
  autoRefresh?: boolean;
  /** Интервал обновления в миллисекундах */
  refreshInterval?: number;
}

/**
 * Хук для работы с приглашениями
 */
export function useEmployeeInvites(options: UseEmployeeInvitesOptions = {}) {
  const { companyId, loading: authLoading } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 5000,
  } = options;

  // Загрузка приглашений
  const {
    data: invites = [],
    isLoading: invitesLoading,
    error: invitesError,
    refetch: refetchInvites,
  } = useQuery<EmployeeInvite[]>({
    queryKey: ["/api/companies", companyId, "employee-invites"],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }
      const response = await apiRequest("GET", `/api/companies/${companyId}/employee-invites`);
      return response.json();
    },
    enabled: !!companyId,
    ...queryConfig.employees,
    // После использования инвайта через Telegram быстро подтягиваем изменения
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Активные приглашения (не использованные)
  const activeInvites = useMemo(() => {
    return invites.filter((inv) => !inv.used_at);
  }, [invites]);

  // Получение ссылки на приглашение
  const fetchInviteLink = useCallback(
    async (code: string): Promise<InviteLink | null> => {
      try {
        const response = await apiRequest("GET", `/api/employee-invites/${code}/link`);
        return response.json();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось получить ссылку-приглашение";
        const isNotFound =
          errorMessage.includes("404") || errorMessage.includes("Invite not found");

        // Пробрасываем ошибку для обработки в компоненте
        throw new Error(
          isNotFound
            ? "Приглашение не найдено или уже использовано"
            : errorMessage
        );
      }
    },
    []
  );

  return {
    invites,
    activeInvites,
    isLoading: authLoading || invitesLoading,
    hasError: !!invitesError,
    error: invitesError,
    refetchInvites,
    fetchInviteLink,
  };
}

