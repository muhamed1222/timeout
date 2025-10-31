// Хук для работы с сотрудниками

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '@/services/employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeSearchDto,
} from '@shared/types';

export function useEmployees(companyId: string) {
  const queryClient = useQueryClient();

  // Получение списка сотрудников
  const {
    data: employees = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => employeeService.getEmployeesByCompany(companyId),
    enabled: !!companyId,
  });

  // Создание сотрудника
  const createEmployeeMutation = useMutation({
    mutationFn: (data: CreateEmployeeDto) =>
      employeeService.createEmployee(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Обновление сотрудника
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Удаление сотрудника
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
    },
  });

  // Поиск сотрудников
  const searchEmployeesMutation = useMutation({
    mutationFn: (searchDto: EmployeeSearchDto) =>
      employeeService.searchEmployees(companyId, searchDto),
  });

  // Получение статистики сотрудника
  const getEmployeeStats = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee-stats', employeeId],
      queryFn: () => employeeService.getEmployeeStats(employeeId),
      enabled: !!employeeId,
    });
  };

  return {
    employees,
    isLoading,
    error,
    refetch,
    createEmployee: createEmployeeMutation.mutate,
    updateEmployee: updateEmployeeMutation.mutate,
    deleteEmployee: deleteEmployeeMutation.mutate,
    searchEmployees: searchEmployeesMutation.mutate,
    getEmployeeStats,
    isCreating: createEmployeeMutation.isPending,
    isUpdating: updateEmployeeMutation.isPending,
    isDeleting: deleteEmployeeMutation.isPending,
    isSearching: searchEmployeesMutation.isPending,
  };
}

export function useEmployee(employeeId: string) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeService.getEmployee(employeeId),
    enabled: !!employeeId,
  });
}
