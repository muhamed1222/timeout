/**
 * Хук для получения данных аналитики эффективности сотрудников
 * Обрабатывает загрузку рейтингов за указанный период
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryConfig } from "@/lib/queryClient";

/**
 * Данные эффективности сотрудника
 */
export interface EmployeeEfficiency {
  id: string;
  name: string;
  efficiency: number;
  change?: number; // положительное = рост, отрицательное = падение, undefined = нет изменений
}

/**
 * Опции для хука useEfficiencyAnalytics
 */
export interface UseEfficiencyAnalyticsOptions {
  /** Начало периода (ISO date string) */
  periodStart?: string;
  /** Конец периода (ISO date string) */
  periodEnd?: string;
  /** Максимальное количество сотрудников для отображения */
  limit?: number;
}

/**
 * Вычисляет период текущего месяца
 */
function getCurrentMonthPeriod(): { start: string; end: string } {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: endOfMonth.toISOString().split("T")[0],
  };
}

/**
 * Хук для получения данных аналитики эффективности
 */
export function useEfficiencyAnalytics(
  options: UseEfficiencyAnalyticsOptions = {}
) {
  const { companyId } = useAuth();
  const { periodStart, periodEnd, limit = 4 } = options;

  // Вычисляем период (используем переданный или текущий месяц)
  const { start: periodStartDate, end: periodEndDate } = useMemo(() => {
    if (periodStart && periodEnd) {
      return { start: periodStart, end: periodEnd };
    }
    return getCurrentMonthPeriod();
  }, [periodStart, periodEnd]);

  // Загрузка рейтингов
  const { data: ratings = [], isLoading } = useQuery({
    ...queryConfig.dashboard,
    queryKey: [
      "/api/companies",
      companyId,
      "ratings",
      periodStartDate,
      periodEndDate,
    ],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const res = await fetch(
        `/api/companies/${companyId}/ratings?periodStart=${periodStartDate}&periodEnd=${periodEndDate}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch ratings");
      }

      return res.json();
    },
    enabled: !!companyId,
  });

  // Трансформация данных рейтингов в формат для отображения
  const employees: EmployeeEfficiency[] = useMemo(() => {
    return ratings
      .slice(0, limit)
      .map((rating: any) => ({
        id: rating.employee_id || rating.id,
        name: rating.employee?.full_name || "Сотрудник",
        efficiency: Math.round(Number(rating.rating || 100)),
        // TODO: добавить логику сравнения с предыдущим периодом для вычисления change
        change: undefined,
      }))
      .sort((a: EmployeeEfficiency, b: EmployeeEfficiency) => b.efficiency - a.efficiency);
  }, [ratings, limit]);

  return {
    employees,
    isLoading,
    periodStart: periodStartDate,
    periodEnd: periodEndDate,
  };
}

