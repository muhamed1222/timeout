// Сервис для управления сотрудниками
import { Employee, EmployeeInvite } from '@shared/types';
import { apiService } from './api.service';

export interface EmployeeSearchCriteria {
  companyId: string;
  status?: 'active' | 'inactive' | 'terminated';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  terminated: number;
}

export interface EmployeeDisplayData {
  id: string;
  fullName: string;
  position: string;
  status: 'active' | 'inactive' | 'terminated';
  timezone: string;
  telegramUserId?: string;
  hasTelegram: boolean;
  createdAt: string;
}

export interface InviteDisplayData {
  id: string;
  code: string;
  fullName: string;
  position: string;
  expiresAt: string;
  isExpired: boolean;
  deepLink: string;
  qrCodeUrl: string;
}

export class EmployeeManagementService {
  // Получение сотрудников компании
  async getEmployees(companyId: string): Promise<Employee[]> {
    try {
      const response = await apiService.get<any>(`/companies/${companyId}/employees`);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error('Не удалось загрузить список сотрудников');
    }
  }

  // Получение приглашений компании
  async getInvites(companyId: string): Promise<EmployeeInvite[]> {
    try {
      const response = await apiService.get<any>(`/companies/${companyId}/invites`);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching invites:', error);
      throw new Error('Не удалось загрузить список приглашений');
    }
  }

  // Трансформация сотрудников для отображения
  transformEmployeesForDisplay(employees: Employee[]): EmployeeDisplayData[] {
    return employees.map(employee => ({
      id: employee.id,
      fullName: employee.full_name,
      position: employee.position,
      status: employee.status as 'active' | 'inactive' | 'terminated',
      timezone: employee.tz || 'UTC',
      telegramUserId: employee.telegram_user_id,
      hasTelegram: !!employee.telegram_user_id,
      createdAt: employee.created_at
    }));
  }

  // Трансформация приглашений для отображения
  transformInvitesForDisplay(invites: EmployeeInvite[]): InviteDisplayData[] {
    return invites.map(invite => {
      const code = (invite as any).code || '';
      const fullName = (invite as any).full_name || '';
      const expiresAt = invite.expires_at || (invite as any).created_at || new Date().toISOString();
      
      return {
        id: invite.id,
        code,
        fullName,
        position: invite.position,
        expiresAt,
        isExpired: invite.expires_at ? new Date(invite.expires_at) < new Date() : false,
        deepLink: `https://t.me/your_bot?start=${code}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/your_bot?start=${code}`
      };
    });
  }

  // Фильтрация сотрудников
  filterEmployees(employees: EmployeeDisplayData[], criteria: {
    status?: 'active' | 'inactive' | 'terminated';
    searchQuery?: string;
  }): EmployeeDisplayData[] {
    let filtered = employees;

    // Фильтр по статусу
    if (criteria.status) {
      filtered = filtered.filter(emp => emp.status === criteria.status);
    }

    // Фильтр по поисковому запросу
    if (criteria.searchQuery?.trim()) {
      const query = criteria.searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.fullName.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  // Получение статистики сотрудников
  getEmployeeStats(employees: EmployeeDisplayData[]): EmployeeStats {
    return {
      total: employees.length,
      active: employees.filter(emp => emp.status === 'active').length,
      inactive: employees.filter(emp => emp.status === 'inactive').length,
      terminated: employees.filter(emp => emp.status === 'terminated').length
    };
  }

  // Получение активных приглашений
  getActiveInvites(invites: InviteDisplayData[]): InviteDisplayData[] {
    return invites.filter(invite => !invite.isExpired);
  }

  // Создание сотрудника
  async createEmployee(companyId: string, data: {
    fullName: string;
    position: string;
    timezone: string;
  }): Promise<Employee> {
    try {
      const response = await apiService.post<Employee>(`/companies/${companyId}/employees`, data);
      return response;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw new Error('Не удалось создать сотрудника');
    }
  }

  // Обновление сотрудника
  async updateEmployee(employeeId: string, data: {
    fullName?: string;
    position?: string;
    timezone?: string;
    status?: 'active' | 'inactive' | 'terminated';
  }): Promise<Employee> {
    try {
      const response = await apiService.patch<Employee>(`/employees/${employeeId}`, data);
      return response;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error('Не удалось обновить данные сотрудника');
    }
  }

  // Удаление сотрудника
  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      await apiService.delete(`/employees/${employeeId}`);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error('Не удалось удалить сотрудника');
    }
  }

  // Создание приглашения
  async createInvite(companyId: string, data: {
    fullName: string;
    position: string;
    timezone: string;
  }): Promise<EmployeeInvite> {
    try {
      const response = await apiService.post<EmployeeInvite>(`/companies/${companyId}/invites`, data);
      return response;
    } catch (error) {
      console.error('Error creating invite:', error);
      throw new Error('Не удалось создать приглашение');
    }
  }

  // Отмена приглашения
  async cancelInvite(companyId: string, inviteId: string): Promise<void> {
    try {
      await apiService.delete(`/companies/${companyId}/invites/${inviteId}`);
    } catch (error) {
      console.error('Error cancelling invite:', error);
      throw new Error('Не удалось отменить приглашение');
    }
  }

  // Получение ссылки-приглашения
  async getInviteLink(inviteCode: string): Promise<{
    code: string;
    deep_link: string;
    qr_code_url: string;
  }> {
    try {
      const response = await apiService.get<{
        code: string;
        deep_link: string;
        qr_code_url: string;
      }>(`/employee-invites/${inviteCode}/link`);
      return response;
    } catch (error) {
      console.error('Error fetching invite link:', error);
      throw new Error('Не удалось получить ссылку-приглашение');
    }
  }

  // Копирование текста в буфер обмена
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw new Error('Не удалось скопировать в буфер обмена');
    }
  }

  // Получение данных для страницы сотрудников
  async getEmployeePageData(companyId: string): Promise<{
    employees: Employee[];
    invites: EmployeeInvite[];
    transformedEmployees: EmployeeDisplayData[];
    transformedInvites: InviteDisplayData[];
    employeeStats: EmployeeStats;
    activeInvites: InviteDisplayData[];
  }> {
    try {
      const [employees, invites] = await Promise.all([
        this.getEmployees(companyId),
        this.getInvites(companyId)
      ]);

      const transformedEmployees = this.transformEmployeesForDisplay(employees);
      const transformedInvites = this.transformInvitesForDisplay(invites);
      const employeeStats = this.getEmployeeStats(transformedEmployees);
      const activeInvites = this.getActiveInvites(transformedInvites);

      return {
        employees,
        invites,
        transformedEmployees,
        transformedInvites,
        employeeStats,
        activeInvites
      };
    } catch (error) {
      console.error('Error fetching employee page data:', error);
      throw new Error('Не удалось загрузить данные страницы сотрудников');
    }
  }

  // Поиск сотрудников
  async searchEmployees(companyId: string, criteria: EmployeeSearchCriteria): Promise<Employee[]> {
    try {
      const params = new URLSearchParams();
      if (criteria.status) params.append('status', criteria.status);
      if (criteria.searchQuery) params.append('search', criteria.searchQuery);
      if (criteria.limit) params.append('limit', criteria.limit.toString());
      if (criteria.offset) params.append('offset', criteria.offset.toString());

      const response = await apiService.get<Employee[]>(`/companies/${companyId}/employees/search?${params}`);
      return response;
    } catch (error) {
      console.error('Error searching employees:', error);
      throw new Error('Не удалось выполнить поиск сотрудников');
    }
  }
}

export const employeeManagementService = new EmployeeManagementService();
