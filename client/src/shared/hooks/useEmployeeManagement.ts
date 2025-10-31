// Хук для управления сотрудниками
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeManagementService, EmployeeDisplayData, InviteDisplayData, EmployeeStats } from '../../services/employee-management.service';
import { Employee, EmployeeInvite } from '@shared/types';

export interface UseEmployeeManagementOptions {
  companyId: string;
  searchQuery?: string;
  statusFilter?: 'active' | 'inactive' | 'terminated' | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useEmployeeManagement({ 
  companyId, 
  searchQuery = '', 
  statusFilter = null,
  autoRefresh = true,
  refreshInterval = 30000 
}: UseEmployeeManagementOptions) {
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Загрузка сотрудников
  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees
  } = useQuery<Employee[]>({
    queryKey: ['employees', companyId],
    queryFn: () => employeeManagementService.getEmployees(companyId),
    enabled: !!companyId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
  });

  // Загрузка приглашений
  const {
    data: invites = [],
    isLoading: invitesLoading,
    error: invitesError,
    refetch: refetchInvites
  } = useQuery<EmployeeInvite[]>({
    queryKey: ['invites', companyId],
    queryFn: () => employeeManagementService.getInvites(companyId),
    enabled: !!companyId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: (failureCount, error: any) => {
      // Не ретраить при 401 ошибках (неавторизован)
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
  });

  // Трансформация данных
  const transformedEmployees = useMemo(() => {
    return employeeManagementService.transformEmployeesForDisplay(employees);
  }, [employees]);

  const transformedInvites = useMemo(() => {
    return employeeManagementService.transformInvitesForDisplay(invites);
  }, [invites]);

  // Фильтрация сотрудников
  const filteredEmployees = useMemo(() => {
    return employeeManagementService.filterEmployees(transformedEmployees, {
      status: statusFilter || undefined,
      searchQuery
    });
  }, [transformedEmployees, statusFilter, searchQuery]);

  // Статистика сотрудников
  const employeeStats = useMemo(() => {
    return employeeManagementService.getEmployeeStats(transformedEmployees);
  }, [transformedEmployees]);

  // Активные приглашения
  const activeInvites = useMemo(() => {
    return employeeManagementService.getActiveInvites(transformedInvites);
  }, [transformedInvites]);

  // Мутация создания сотрудника
  const createEmployeeMutation = useMutation({
    mutationFn: (data: { fullName: string; position: string; timezone: string }) =>
      employeeManagementService.createEmployee(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Мутация обновления сотрудника
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      employeeManagementService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Мутация удаления сотрудника
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeManagementService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Мутация создания приглашения
  const createInviteMutation = useMutation({
    mutationFn: (data: { fullName: string; position: string; timezone: string }) =>
      employeeManagementService.createInvite(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', companyId] });
    },
  });

  // Мутация отмены приглашения
  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) => employeeManagementService.cancelInvite(companyId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', companyId] });
    },
  });

  // Копирование кода приглашения
  const copyInviteCode = useCallback(async (code: string) => {
    try {
      await employeeManagementService.copyToClipboard(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      throw new Error('Не удалось скопировать код приглашения');
    }
  }, []);

  // Получение ссылки-приглашения
  const getInviteLink = useCallback(async (inviteCode: string) => {
    try {
      return await employeeManagementService.getInviteLink(inviteCode);
    } catch (error) {
      throw new Error('Не удалось получить ссылку-приглашение');
    }
  }, []);

  // Обновление данных
  const refresh = useCallback(async () => {
    await Promise.all([refetchEmployees(), refetchInvites()]);
  }, [refetchEmployees, refetchInvites]);

  // Статус загрузки
  const isLoading = employeesLoading || invitesLoading;
  const hasError = employeesError || invitesError;

  return {
    // Данные
    employees,
    invites,
    transformedEmployees,
    transformedInvites,
    filteredEmployees,
    employeeStats,
    activeInvites,
    
    // Состояние
    isLoading,
    hasError,
    copiedCode,
    
    // Мутации
    createEmployee: createEmployeeMutation,
    updateEmployee: updateEmployeeMutation,
    deleteEmployee: deleteEmployeeMutation,
    createInvite: createInviteMutation,
    cancelInvite: cancelInviteMutation,
    
    // Действия
    copyInviteCode,
    getInviteLink,
    refresh,
    
    // Методы
    refetchEmployees,
    refetchInvites
  };
}
