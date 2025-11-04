// Хук для работы с сотрудниками

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService, type CreateEmployeeData, type UpdateEmployeeData } from "@/services/employee.service";

export function useEmployees(companyId: string) {
  const queryClient = useQueryClient();

  // Получение списка сотрудников
  const {
    data: employees = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => employeeService.getEmployees(companyId),
    enabled: !!companyId,
  });

  // Создание сотрудника
  const createEmployeeMutation = useMutation({
    mutationFn: (data: CreateEmployeeData) =>
      employeeService.createEmployee(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    },
  });

  // Обновление сотрудника
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeData }) =>
      employeeService.updateEmployee(companyId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    },
  });

  // Удаление сотрудника
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeService.deleteEmployee(companyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    },
  });

  // Поиск сотрудников
  const searchEmployeesMutation = useMutation({
    mutationFn: (query: string) =>
      employeeService.searchEmployees(companyId, query),
  });

  // Получение статистики сотрудника
  const getEmployeeStats = (employeeId: string) => {
    return useQuery({
      queryKey: ["employee-stats", companyId, employeeId],
      queryFn: () => employeeService.getEmployeeStats(companyId, employeeId),
      enabled: !!employeeId && !!companyId,
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

export function useEmployee(companyId: string, employeeId: string) {
  return useQuery({
    queryKey: ["employee", companyId, employeeId],
    queryFn: () => employeeService.getEmployee(companyId, employeeId),
    enabled: !!employeeId && !!companyId,
  });
}
