/**
 * Хук для получения данных дашборда
 * Инкапсулирует всю логику загрузки и обработки данных для страницы Dashboard
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryConfig, apiRequest } from "@/lib/queryClient";
import type { CompanyStats, ActiveShift } from "@/types";

/**
 * Конфигурация таймаутов для запросов
 */
const REQUEST_TIMEOUT = 6000; // 6 секунд

/**
 * Создает AbortController с таймаутом
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Возвращаем модифицированный controller с методом clearTimeout
  (controller as any).clearTimeout = () => clearTimeout(timeoutId);
  return controller;
}

/**
 * Получает статистику компании с обработкой таймаутов и fallback данных
 */
async function fetchCompanyStats(companyId: string): Promise<CompanyStats> {
  const controller = createTimeoutController(REQUEST_TIMEOUT);
  
  try {
    const res = await fetch(`/api/companies/${companyId}/stats`, {
      signal: controller.signal,
      credentials: "include",
    });
    
    (controller as any).clearTimeout();
    
    // Если получили 503 с fallback данными, используем их
    if (res.status === 503) {
      const data = await res.json();
      if (data.fallback) {
        return data.fallback;
      }
    }
    
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    (controller as any).clearTimeout();
    
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - database unavailable");
    }
    throw error;
  }
}

/**
 * Получает активные смены с обработкой таймаутов
 */
async function fetchActiveShifts(companyId: string): Promise<ActiveShift[]> {
  const controller = createTimeoutController(REQUEST_TIMEOUT);
  
  try {
    const res = await fetch(`/api/companies/${companyId}/shifts/active`, {
      signal: controller.signal,
      credentials: "include",
    });
    
    (controller as any).clearTimeout();
    
    // При 503 или таймауте возвращаем пустой массив
    if (res.status === 503) {
      return [];
    }
    
    if (!res.ok) {
      throw new Error(`Failed to fetch shifts: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    (controller as any).clearTimeout();
    
    if (error instanceof Error && error.name === "AbortError") {
      // Возвращаем пустой массив при таймауте вместо ошибки
      return [];
    }
    throw error;
  }
}

/**
 * Получает завершенные смены за сегодня
 */
async function fetchCompletedShiftsToday(companyId: string): Promise<ActiveShift[]> {
  const today = new Date().toISOString().split("T")[0];
  
  try {
    const res = await apiRequest("GET", `/api/companies/${companyId}/shifts/active`);
    const allShifts: ActiveShift[] = await res.json();
    
    // Фильтруем завершенные смены за сегодня
    return allShifts.filter(
      (shift) =>
        shift.status === "completed" &&
        shift.planned_start_at.startsWith(today)
    );
  } catch (error) {
    console.error("Error fetching completed shifts:", error);
    return [];
  }
}

/**
 * Опции для хука useDashboardData
 */
export interface UseDashboardDataOptions {
  /** Автоматически обновлять данные */
  autoRefresh?: boolean;
  /** Интервал обновления в миллисекундах */
  refreshInterval?: number;
}

/**
 * Хук для получения всех данных дашборда
 */
export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { companyId, loading: authLoading } = useAuth();
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  // Загрузка статистики компании
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<CompanyStats>({
    ...queryConfig.dashboard,
    queryKey: ["/api/companies", companyId, "stats"],
    queryFn: () => fetchCompanyStats(companyId!),
    enabled: !!companyId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 20000,
    retry: (failureCount, error) => {
      // Не ретраить при таймауте или недоступности БД
      if (
        error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("unavailable"))
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Загрузка активных смен
  const {
    data: activeShifts = [],
    isLoading: shiftsLoading,
    error: shiftsError,
  } = useQuery<ActiveShift[]>({
    ...queryConfig.live,
    queryKey: ["/api/companies", companyId, "shifts", "active"],
    queryFn: () => fetchActiveShifts(companyId!),
    enabled: !!companyId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 20000,
    retry: (failureCount, error) => {
      // Не ретраить при таймауте
      if (
        error instanceof Error &&
        error.message.includes("timeout")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Загрузка завершенных смен за сегодня
  const today = new Date().toISOString().split("T")[0];
  const {
    data: completedShifts = [],
    isLoading: completedLoading,
  } = useQuery<ActiveShift[]>({
    ...queryConfig.dashboard,
    queryKey: ["/api/companies", companyId, "shifts", "completed", today],
    queryFn: () => fetchCompletedShiftsToday(companyId!),
    enabled: !!companyId,
  });

  return {
    stats: stats || {
      totalEmployees: 0,
      activeShifts: 0,
      completedShifts: 0,
      exceptions: 0,
    },
    activeShifts,
    completedShifts,
    isLoading: authLoading || statsLoading || shiftsLoading || completedLoading,
    errors: {
      stats: statsError,
      shifts: shiftsError,
    },
  };
}

