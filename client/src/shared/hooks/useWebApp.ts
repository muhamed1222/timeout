// Хук для работы с Telegram WebApp
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webAppService, EmployeeData, ShiftStatus, GeolocationData, ShiftActionData } from '../../services/webapp.service';
import { useGeolocation } from './useGeolocation';

export interface UseWebAppOptions {
  telegramUserId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWebApp({ 
  telegramUserId, 
  autoRefresh = true,
  refreshInterval = 30000 
}: UseWebAppOptions) {
  const queryClient = useQueryClient();
  const { latitude, longitude, getCurrentPosition } = useGeolocation();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Загрузка данных сотрудника
  const {
    data: employeeData,
    isLoading: employeeLoading,
    error: employeeError,
    refetch: refetchEmployee
  } = useQuery<EmployeeData>({
    queryKey: ['employee-data', telegramUserId],
    queryFn: () => webAppService.getEmployeeData(telegramUserId),
    enabled: !!telegramUserId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
  });

  // Загрузка текущей смены
  const {
    data: currentShift,
    isLoading: shiftLoading,
    error: shiftError,
    refetch: refetchShift
  } = useQuery<ShiftStatus | null>({
    queryKey: ['current-shift', employeeData?.employee.id],
    queryFn: () => employeeData ? webAppService.getCurrentShift(employeeData.employee.id) : null,
    enabled: !!employeeData?.employee.id,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
  });

  // Мутация начала смены
  const startShiftMutation = useMutation({
    mutationFn: (data: ShiftActionData) => webAppService.startShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['employee-data'] });
    },
  });

  // Мутация завершения смены
  const endShiftMutation = useMutation({
    mutationFn: (data: ShiftActionData) => webAppService.endShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['employee-data'] });
    },
  });

  // Мутация начала перерыва
  const startBreakMutation = useMutation({
    mutationFn: (data: ShiftActionData) => webAppService.startBreak(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
    },
  });

  // Мутация завершения перерыва
  const endBreakMutation = useMutation({
    mutationFn: (data: ShiftActionData) => webAppService.endBreak(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
    },
  });

  // Получение текущей геолокации
  const getCurrentLocation = useCallback(async (): Promise<GeolocationData | null> => {
    setIsLoadingLocation(true);
    try {
      const location = await webAppService.getCurrentLocation();
      if (webAppService.validateLocation(location)) {
        return location;
      }
      return null;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Выполнение действия смены
  const performShiftAction = useCallback(async (action: string, notes?: string) => {
    if (!currentShift) {
      throw new Error('Нет активной смены');
    }

    const location = await getCurrentLocation();
    
    const actionData: ShiftActionData = {
      shiftId: currentShift.id,
      action: action as any,
      location: location || undefined,
      notes
    };

    switch (action) {
    case 'start':
      return startShiftMutation.mutateAsync(actionData);
    case 'end':
      return endShiftMutation.mutateAsync(actionData);
    case 'break':
      return startBreakMutation.mutateAsync(actionData);
    case 'resume':
      return endBreakMutation.mutateAsync(actionData);
    default:
      throw new Error(`Неизвестное действие: ${action}`);
    }
  }, [currentShift, getCurrentLocation, startShiftMutation, endShiftMutation, startBreakMutation, endBreakMutation]);

  // Доступные действия
  const availableActions = useMemo(() => {
    if (!currentShift) return [];
    return webAppService.getAvailableActions(currentShift);
  }, [currentShift]);

  // Статус смены
  const shiftStatus = useMemo(() => {
    if (!currentShift) return 'unknown';
    return webAppService.getShiftStatus(currentShift);
  }, [currentShift]);

  // Форматированные данные
  const formattedData = useMemo(() => {
    if (!currentShift) return null;

    return {
      plannedStart: webAppService.formatTime(currentShift.plannedStartAt),
      plannedEnd: webAppService.formatTime(currentShift.plannedEndAt),
      actualStart: currentShift.actualStartAt ? webAppService.formatTime(currentShift.actualStartAt) : null,
      actualEnd: currentShift.actualEndAt ? webAppService.formatTime(currentShift.actualEndAt) : null,
      duration: currentShift.actualStartAt ? webAppService.formatDuration(
        currentShift.actualStartAt, 
        currentShift.actualEndAt
      ) : null,
      statusText: webAppService.getStatusText(currentShift.status),
      statusColor: webAppService.getStatusColor(currentShift.status)
    };
  }, [currentShift]);

  // Обновление данных
  const refresh = useCallback(async () => {
    await Promise.all([refetchEmployee(), refetchShift()]);
  }, [refetchEmployee, refetchShift]);

  // Статус загрузки
  const isLoading = employeeLoading || shiftLoading;
  const hasError = employeeError || shiftError;

  // Мутации
  const mutations = {
    startShift: startShiftMutation,
    endShift: endShiftMutation,
    startBreak: startBreakMutation,
    endBreak: endBreakMutation
  };

  // Проверка состояния мутаций
  const isMutating = Object.values(mutations).some(mutation => mutation.isPending);

  return {
    // Данные
    employeeData,
    currentShift,
    formattedData,
    
    // Состояние
    isLoading,
    hasError,
    isMutating,
    isLoadingLocation,
    
    // Действия
    availableActions,
    shiftStatus,
    
    // Методы
    performShiftAction,
    getCurrentLocation,
    refresh,
    
    // Мутации
    mutations,
    
    // Утилиты
    formatTime: webAppService.formatTime,
    formatDate: webAppService.formatDate,
    formatDuration: webAppService.formatDuration,
    getStatusText: webAppService.getStatusText,
    getStatusColor: webAppService.getStatusColor,
    getActionButtonText: webAppService.getActionButtonText,
    getActionIcon: webAppService.getActionIcon,
    canPerformAction: (action: string) => currentShift ? webAppService.canPerformAction(currentShift, action) : false
  };
}
