// Сервис для работы с сотрудниками

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import {
  Employee,
  EmployeeInvite,
  ApiResponse,
  FilterOptions,
  SortOptions,
  PaginationOptions,
} from '../types';

export interface CreateEmployeeData {
  full_name: string;
  position: string;
  company_id: string;
  telegram_user_id?: string;
  [key: string]: unknown;
}

export interface UpdateEmployeeData {
  full_name?: string;
  position?: string;
  telegram_user_id?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface CreateInviteData {
  full_name: string;
  position: string;
  company_id: string;
  [key: string]: unknown;
}

export class EmployeeService {
  // Получение всех сотрудников компании
  async getEmployees(
    companyId: string,
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Employee[]> {
    const params = {
      ...filters,
      ...sort,
      ...pagination,
    };

    const response = await apiService.get<Employee[]>(
      API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId),
      params
    );

    return response;
  }

  // Получение сотрудника по ID
  async getEmployee(companyId: string, employeeId: string): Promise<Employee> {
    const response = await apiService.get<Employee>(
      API_ENDPOINTS.COMPANIES.EMPLOYEE_BY_ID(companyId, employeeId)
    );

    return response;
  }

  // Создание сотрудника
  async createEmployee(
    companyId: string,
    data: CreateEmployeeData
  ): Promise<Employee> {
    const response = await apiService.post<ApiResponse<Employee>>(
      API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId),
      data
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Обновление сотрудника
  async updateEmployee(
    companyId: string,
    employeeId: string,
    data: UpdateEmployeeData
  ): Promise<Employee> {
    const response = await apiService.patch<ApiResponse<Employee>>(
      API_ENDPOINTS.COMPANIES.EMPLOYEE_BY_ID(companyId, employeeId),
      data
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Удаление сотрудника
  async deleteEmployee(companyId: string, employeeId: string): Promise<void> {
    const response = await apiService.delete<ApiResponse>(
      API_ENDPOINTS.COMPANIES.EMPLOYEE_BY_ID(companyId, employeeId)
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Получение всех приглашений компании
  async getInvites(companyId: string): Promise<EmployeeInvite[]> {
    const response = await apiService.get<EmployeeInvite[]>(
      API_ENDPOINTS.COMPANIES.INVITES(companyId)
    );

    return response;
  }

  // Получение приглашения по ID
  async getInvite(
    companyId: string,
    inviteId: string
  ): Promise<EmployeeInvite> {
    const response = await apiService.get<EmployeeInvite>(
      API_ENDPOINTS.COMPANIES.INVITE_BY_ID(companyId, inviteId)
    );

    return response;
  }

  // Создание приглашения
  async createInvite(
    companyId: string,
    data: CreateInviteData
  ): Promise<EmployeeInvite> {
    const response = await apiService.post<ApiResponse<EmployeeInvite>>(
      API_ENDPOINTS.COMPANIES.INVITES(companyId),
      data
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Отмена приглашения
  async cancelInvite(companyId: string, inviteId: string): Promise<void> {
    const response = await apiService.delete<ApiResponse>(
      API_ENDPOINTS.COMPANIES.INVITE_BY_ID(companyId, inviteId)
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Повторная отправка приглашения
  async resendInvite(
    companyId: string,
    inviteId: string
  ): Promise<EmployeeInvite> {
    const response = await apiService.post<ApiResponse<EmployeeInvite>>(
      `${API_ENDPOINTS.COMPANIES.INVITE_BY_ID(companyId, inviteId)}/resend`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Поиск сотрудников
  async searchEmployees(companyId: string, query: string): Promise<Employee[]> {
    const response = await apiService.get<Employee[]>(
      `${API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId)}/search`,
      { q: query }
    );

    return response;
  }

  // Получение статистики сотрудника
  async getEmployeeStats(companyId: string, employeeId: string): Promise<any> {
    const response = await apiService.get<any>(
      `${API_ENDPOINTS.COMPANIES.EMPLOYEE_BY_ID(companyId, employeeId)}/stats`
    );

    return response;
  }

  // Массовое обновление статуса сотрудников
  async bulkUpdateStatus(
    companyId: string,
    employeeIds: string[],
    status: string
  ): Promise<void> {
    const response = await apiService.patch<ApiResponse>(
      `${API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId)}/bulk-status`,
      { employeeIds, status }
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Экспорт списка сотрудников
  async exportEmployees(
    companyId: string,
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<void> {
    await apiService.downloadFile(
      `${API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId)}/export?format=${format}`,
      `employees.${format}`
    );
  }

  // Импорт сотрудников
  async importEmployees(
    companyId: string,
    file: File
  ): Promise<{ success: number; errors: string[] }> {
    const response = await apiService.uploadFile<
      ApiResponse<{ success: number; errors: string[] }>
    >(`${API_ENDPOINTS.COMPANIES.EMPLOYEES(companyId)}/import`, file);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }
}

export const employeeService = new EmployeeService();
export default employeeService;
