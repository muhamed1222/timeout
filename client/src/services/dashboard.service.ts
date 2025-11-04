// Сервис для бизнес-логики дашборда
import { Shift } from "@shared/types";
import type { ShiftWithEmployee } from "@shared/api-types";
import { apiService } from "./api.service";

export interface DashboardStats {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
}

export interface ShiftDisplayData {
  id: string;
  employeeName: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  status: "active" | "break" | "late" | "done";
  lastReport?: string;
  location?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  employeeName: string;
  employeeImage?: string;
  description: string;
  timestamp: string;
}

export interface ExportData {
  Сотрудник: string;
  Должность: string;
  Начало: string;
  Конец: string;
  Статус: string;
  Локация: string;
}

export class DashboardService {
  // Получение статистики компании
  async getCompanyStats(companyId: string): Promise<DashboardStats> {
    try {
      const response = await apiService.get<any>(`/companies/${companyId}/stats`);
      // Backend возвращает {success: true, data: {...}}
      return response.data || response;
    } catch (error) {
      console.error("Error fetching company stats:", error);
      throw new Error("Не удалось загрузить статистику компании");
    }
  }

  // Получение активных смен
  async getActiveShifts(companyId: string): Promise<ShiftWithEmployee[]> {
    try {
      const response = await apiService.get<ShiftWithEmployee[]>(`/companies/${companyId}/shifts/active`);
      // Backend возвращает массив смен с employee данными
      return response || [];
    } catch (error) {
      console.error("Error fetching active shifts:", error);
      throw new Error("Не удалось загрузить активные смены");
    }
  }

  // Трансформация данных смен для отображения
  transformShiftsForDisplay(shifts: ShiftWithEmployee[]): ShiftDisplayData[] {
    return shifts.map(shift => ({
      id: shift.id,
      employeeName: shift.employee?.full_name || "Неизвестный сотрудник",
      position: shift.employee?.position || "Должность не указана",
      shiftStart: new Date(shift.planned_start_at).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      shiftEnd: new Date(shift.planned_end_at).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: this.getShiftStatus(shift),
      lastReport: shift.notes || undefined,
      location: undefined, // Location data not available in current schema
    }));
  }

  // Определение статуса смены
  private getShiftStatus(shift: Shift | ShiftWithEmployee): "active" | "break" | "late" | "done" {
    if (shift.status === "completed") {
      return "done";
    }
    if (shift.status === "active") {
      return "active";
    }
    return "late";
  }

  // Фильтрация смен по поисковому запросу
  filterShifts(shifts: ShiftDisplayData[], searchQuery: string): ShiftDisplayData[] {
    if (!searchQuery.trim()) {
      return shifts;
    }

    const query = searchQuery.toLowerCase();
    return shifts.filter(shift =>
      shift.employeeName.toLowerCase().includes(query) ||
      shift.position.toLowerCase().includes(query),
    );
  }

  // Генерация активности на основе смен
  generateActivitiesFromShifts(shifts: ShiftWithEmployee[]): ActivityItem[] {
    const activities: ActivityItem[] = [];

    shifts.forEach(shift => {
      const employeeName = shift.employee?.full_name || "Неизвестный сотрудник";
      const employeeImage = shift.employee?.photo_url || undefined;
      
      if (shift.actual_start_at) {
        activities.push({
          id: `work-${shift.id}`,
          type: "shift_start",
          employeeName,
          employeeImage,
          description: "Начал смену",
          timestamp: new Date(shift.actual_start_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }

      if (shift.actual_end_at) {
        activities.push({
          id: `end-${shift.id}`,
          type: "shift_end",
          employeeName,
          employeeImage,
          description: "Завершил смену",
          timestamp: new Date(shift.actual_end_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    });

    // Сортируем по времени (новые сверху)
    return activities.sort((a, b) => {
      const timeA = new Date(`1970-01-01 ${a.timestamp}`).getTime();
      const timeB = new Date(`1970-01-01 ${b.timestamp}`).getTime();
      return timeB - timeA;
    });
  }

  // Экспорт данных в CSV
  exportToCSV(data: ShiftDisplayData[], filename?: string): void {
    if (data.length === 0) {
      throw new Error("Нет данных для экспорта");
    }

    const exportData: ExportData[] = data.map(shift => ({
      Сотрудник: shift.employeeName,
      Должность: shift.position,
      Начало: shift.shiftStart,
      Конец: shift.shiftEnd,
      Статус: shift.status,
      Локация: shift.location || "-",
    }));

    const csv = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map(row => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename || `shifts_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Получение данных для дашборда
  async getDashboardData(companyId: string): Promise<{
    stats: DashboardStats;
    activeShifts: ShiftWithEmployee[];
    transformedShifts: ShiftDisplayData[];
    activities: ActivityItem[];
  }> {
    try {
      const [stats, activeShifts] = await Promise.all([
        this.getCompanyStats(companyId),
        this.getActiveShifts(companyId),
      ]);

      const transformedShifts = this.transformShiftsForDisplay(activeShifts);
      const activities = this.generateActivitiesFromShifts(activeShifts);

      return {
        stats,
        activeShifts,
        transformedShifts,
        activities,
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw new Error("Не удалось загрузить данные дашборда");
    }
  }

  // Получение статистики производительности
  async getPerformanceStats(companyId: string): Promise<{
    averageShiftDuration: number;
    onTimeRate: number;
    activeEmployees: number;
  }> {
    try {
      const response = await apiService.get<{
        averageShiftDuration: number;
        onTimeRate: number;
        activeEmployees: number;
      }>(`/companies/${companyId}/performance-stats`);
      return response;
    } catch (error) {
      console.error("Error fetching performance stats:", error);
      throw new Error("Не удалось загрузить статистику производительности");
    }
  }
}

export const dashboardService = new DashboardService();
