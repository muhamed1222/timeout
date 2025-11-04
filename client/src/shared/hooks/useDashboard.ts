// Хук для работы с дашбордом
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService, DashboardStats, ShiftDisplayData, IActivityItem } from "../../services/dashboard.service";
import type { Shift } from "@outcasts/shared/schema";
import type { ShiftWithEmployee } from "@outcasts/shared/api-types";

export interface UseDashboardOptions {
  companyId: string;
  searchQuery?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useDashboard({ 
  companyId, 
  searchQuery = "", 
  autoRefresh = true,
  refreshInterval = 30000,
  enabled = true,
}: UseDashboardOptions) {
  const [isExporting, setIsExporting] = useState(false);

  // Загрузка статистики
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", companyId],
    queryFn: () => dashboardService.getCompanyStats(companyId),
    enabled: enabled && !!companyId, // Используем явный флаг enabled
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Загрузка активных смен
  const {
    data: activeShifts = [],
    isLoading: shiftsLoading,
    error: shiftsError,
    refetch: refetchShifts,
  } = useQuery<ShiftWithEmployee[]>({
    queryKey: ["active-shifts", companyId],
    queryFn: () => dashboardService.getActiveShifts(companyId),
    enabled: enabled && !!companyId, // Используем явный флаг enabled
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Трансформация данных смен
  const transformedShifts = useMemo(() => {
    return dashboardService.transformShiftsForDisplay(activeShifts);
  }, [activeShifts]);

  // Фильтрация смен
  const filteredShifts = useMemo(() => {
    return dashboardService.filterShifts(transformedShifts, searchQuery);
  }, [transformedShifts, searchQuery]);

  // Генерация активности
  const activities = useMemo(() => {
    return dashboardService.generateActivitiesFromShifts(activeShifts);
  }, [activeShifts]);

  // Экспорт в CSV
  const exportToCSV = useCallback(async (filename?: string) => {
    if (filteredShifts.length === 0) {
      throw new Error("Нет данных для экспорта");
    }

    setIsExporting(true);
    try {
      dashboardService.exportToCSV(filteredShifts, filename);
    } finally {
      setIsExporting(false);
    }
  }, [filteredShifts]);

  // Обновление данных
  const refresh = useCallback(async () => {
    await Promise.all([refetchStats(), refetchShifts()]);
  }, [refetchStats, refetchShifts]);

  // Статус загрузки
  const isLoading = statsLoading || shiftsLoading;
  const hasError = statsError || shiftsError;

  return {
    // Данные
    stats: stats || {
      totalEmployees: 0,
      activeShifts: 0,
      completedShifts: 0,
      exceptions: 0,
    },
    activeShifts,
    transformedShifts,
    filteredShifts,
    activities,
    
    // Состояние
    isLoading,
    hasError,
    isExporting,
    
    // Действия
    exportToCSV,
    refresh,
    
    // Методы
    refetchStats,
    refetchShifts,
  };
}
