// Сервис для работы со сменами

import { apiService } from "./api.service";
import { API_ENDPOINTS } from "../constants/api.constants";
import {
  Shift,
  ApiResponse,
  FilterOptions,
  SortOptions,
  PaginationOptions,
} from "../types";

export interface CreateShiftData {
  employee_id: string;
  company_id: string;
  planned_start_at: string;
  planned_end_at: string;
  [key: string]: unknown;
}

export interface UpdateShiftData {
  planned_start_at?: string;
  planned_end_at?: string;
  actual_start_at?: string;
  actual_end_at?: string;
  status?: string;
  [key: string]: unknown;
}

export class ShiftService {
  // Получение активных смен компании
  async getActiveShifts(companyId: string): Promise<Shift[]> {
    const response = await apiService.get<Shift[]>(
      API_ENDPOINTS.COMPANIES.SHIFTS.ACTIVE(companyId),
    );

    return response;
  }

  // Получение запланированных смен компании
  async getPlannedShifts(companyId: string): Promise<Shift[]> {
    const response = await apiService.get<Shift[]>(
      API_ENDPOINTS.COMPANIES.SHIFTS.PLANNED(companyId),
    );

    return response;
  }

  // Получение всех смен компании с фильтрацией
  async getShifts(
    companyId: string,
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions,
  ): Promise<Shift[]> {
    const params = {
      ...filters,
      ...sort,
      ...pagination,
    };

    const response = await apiService.get<Shift[]>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts`,
      params,
    );

    return response;
  }

  // Получение смены по ID
  async getShift(companyId: string, shiftId: string): Promise<Shift> {
    const response = await apiService.get<Shift>(
      API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId),
    );

    return response;
  }

  // Создание смены
  async createShift(companyId: string, data: CreateShiftData): Promise<Shift> {
    const response = await apiService.post<ApiResponse<Shift>>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts`,
      data,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Обновление смены
  async updateShift(
    companyId: string,
    shiftId: string,
    data: UpdateShiftData,
  ): Promise<Shift> {
    const response = await apiService.patch<ApiResponse<Shift>>(
      API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId),
      data,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Удаление смены
  async deleteShift(companyId: string, shiftId: string): Promise<void> {
    const response = await apiService.delete<ApiResponse>(
      API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId),
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Начало смены
  async startShift(companyId: string, shiftId: string): Promise<Shift> {
    const response = await apiService.post<ApiResponse<Shift>>(
      `${API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId)}/start`,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Завершение смены
  async endShift(
    companyId: string,
    shiftId: string,
    notes?: string,
  ): Promise<Shift> {
    const response = await apiService.post<ApiResponse<Shift>>(
      `${API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId)}/end`,
      { notes },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Получение смен сотрудника
  async getEmployeeShifts(
    companyId: string,
    employeeId: string,
    filters?: FilterOptions,
  ): Promise<Shift[]> {
    const params = {
      ...filters,
    };

    const response = await apiService.get<Shift[]>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/employees/${employeeId}/shifts`,
      params,
    );

    return response;
  }

  // Получение текущей активной смены сотрудника
  async getCurrentShift(
    companyId: string,
    employeeId: string,
  ): Promise<Shift | null> {
    try {
      const response = await apiService.get<Shift>(
        `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/employees/${employeeId}/current-shift`,
      );

      return response;
    } catch {
      // Если смены нет, возвращаем null
      return null;
    }
  }

  // Массовое создание смен
  async bulkCreateShifts(
    companyId: string,
    shifts: CreateShiftData[],
  ): Promise<Shift[]> {
    const response = await apiService.post<ApiResponse<Shift[]>>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/bulk`,
      { shifts },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Массовое обновление смен
  async bulkUpdateShifts(
    companyId: string,
    shiftIds: string[],
    data: UpdateShiftData,
  ): Promise<void> {
    const response = await apiService.patch<ApiResponse>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/bulk`,
      { shiftIds, data },
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Массовое удаление смен
  async bulkDeleteShifts(companyId: string, shiftIds: string[]): Promise<void> {
    const response = await apiService.delete<ApiResponse>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/bulk`,
      { shiftIds },
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Получение статистики смен
  async getShiftStats(
    companyId: string,
    filters?: FilterOptions,
  ): Promise<any> {
    const params = {
      ...filters,
    };

    const response = await apiService.get<any>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/stats`,
      params,
    );

    return response;
  }

  // Экспорт смен
  async exportShifts(
    companyId: string,
    format: "csv" | "xlsx" = "csv",
  ): Promise<void> {
    await apiService.downloadFile(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/export?format=${format}`,
      `shifts.${format}`,
    );
  }

  // Копирование смены
  async copyShift(
    companyId: string,
    shiftId: string,
    newDate: string,
  ): Promise<Shift> {
    const response = await apiService.post<ApiResponse<Shift>>(
      `${API_ENDPOINTS.COMPANIES.SHIFTS.BY_ID(companyId, shiftId)}/copy`,
      { newDate },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Получение смен за период
  async getShiftsByPeriod(
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<Shift[]> {
    const response = await apiService.get<Shift[]>(
      `${API_ENDPOINTS.COMPANIES.BY_ID(companyId)}/shifts/period`,
      { startDate, endDate },
    );

    return response;
  }
}

export const shiftService = new ShiftService();
export default shiftService;
