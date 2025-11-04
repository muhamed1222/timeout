// Сервис для бизнес-логики Telegram WebApp
import { apiService } from "./api.service";

export interface EmployeeData {
  employee: {
    id: string;
    name: string;
    telegram_user_id: string;
  };
  activeShift?: Record<string, unknown>;
  workIntervals: Record<string, unknown>[];
  breakIntervals: Record<string, unknown>[];
  status: "off_work" | "working" | "on_break" | "unknown";
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface ShiftActionData {
  shiftId: string;
  action: "start" | "end" | "break" | "resume";
  location?: GeolocationData;
  notes?: string;
}

export interface ShiftStatus {
  id: string;
  status: "planned" | "active" | "on_break" | "completed" | "cancelled";
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartAt?: string;
  actualEndAt?: string;
  location?: GeolocationData;
  notes?: string;
}

export class WebAppService {
  // Получение данных сотрудника
  async getEmployeeData(telegramUserId: string): Promise<EmployeeData> {
    try {
      const response = await apiService.get<EmployeeData>(`/telegram/employee/${telegramUserId}`);
      return response;
    } catch (error) {
      console.error("Error fetching employee data:", error);
      throw new Error("Не удалось загрузить данные сотрудника");
    }
  }

  // Получение текущей смены
  async getCurrentShift(employeeId: string): Promise<ShiftStatus | null> {
    try {
      const response = await apiService.get<ShiftStatus>(`/employees/${employeeId}/current-shift`);
      return response;
    } catch (error) {
      console.error("Error fetching current shift:", error);
      return null;
    }
  }

  // Начало смены
  async startShift(data: ShiftActionData): Promise<ShiftStatus> {
    try {
      const response = await apiService.post<ShiftStatus>("/shifts/start", {
        shiftId: data.shiftId,
        location: data.location,
        notes: data.notes,
      });
      return response;
    } catch (error) {
      console.error("Error starting shift:", error);
      throw new Error("Не удалось начать смену");
    }
  }

  // Завершение смены
  async endShift(data: ShiftActionData): Promise<ShiftStatus> {
    try {
      const response = await apiService.post<ShiftStatus>("/shifts/end", {
        shiftId: data.shiftId,
        location: data.location,
        notes: data.notes,
      });
      return response;
    } catch (error) {
      console.error("Error ending shift:", error);
      throw new Error("Не удалось завершить смену");
    }
  }

  // Начало перерыва
  async startBreak(data: ShiftActionData): Promise<ShiftStatus> {
    try {
      const response = await apiService.post<ShiftStatus>("/shifts/break", {
        shiftId: data.shiftId,
        location: data.location,
        notes: data.notes,
      });
      return response;
    } catch (error) {
      console.error("Error starting break:", error);
      throw new Error("Не удалось начать перерыв");
    }
  }

  // Завершение перерыва
  async endBreak(data: ShiftActionData): Promise<ShiftStatus> {
    try {
      const response = await apiService.post<ShiftStatus>("/shifts/resume", {
        shiftId: data.shiftId,
        location: data.location,
        notes: data.notes,
      });
      return response;
    } catch (error) {
      console.error("Error ending break:", error);
      throw new Error("Не удалось завершить перерыв");
    }
  }

  // Получение геолокации
  async getCurrentLocation(): Promise<GeolocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Геолокация не поддерживается"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(new Error(`Ошибка получения геолокации: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 минут
        },
      );
    });
  }

  // Валидация геолокации
  validateLocation(location: GeolocationData): boolean {
    if (!location.latitude || !location.longitude) {
      return false;
    }

    if (location.latitude < -90 || location.latitude > 90) {
      return false;
    }

    if (location.longitude < -180 || location.longitude > 180) {
      return false;
    }

    if (location.accuracy && location.accuracy > 100) {
      return false; // Точность хуже 100 метров
    }

    return true;
  }

  // Форматирование времени
  formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "--:--";
    }
  }

  // Форматирование даты
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "--.--.----";
    }
  }

  // Форматирование продолжительности
  formatDuration(startTime: string, endTime?: string): string {
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } catch (error) {
      return "00:00";
    }
  }

  // Определение статуса смены
  getShiftStatus(shift: ShiftStatus): "planned" | "active" | "on_break" | "completed" | "cancelled" {
    return shift.status;
  }

  // Определение доступных действий
  getAvailableActions(shift: ShiftStatus): string[] {
    const actions: string[] = [];

    switch (shift.status) {
      case "planned":
        actions.push("start");
        break;
      case "active":
        actions.push("break", "end");
        break;
      case "on_break":
        actions.push("resume", "end");
        break;
      case "completed":
      case "cancelled":
      // Нет доступных действий
        break;
    }

    return actions;
  }

  // Проверка возможности выполнения действия
  canPerformAction(shift: ShiftStatus, action: string): boolean {
    const availableActions = this.getAvailableActions(shift);
    return availableActions.includes(action);
  }

  // Получение текста для кнопки
  getActionButtonText(action: string): string {
    switch (action) {
      case "start":
        return "Начать смену";
      case "end":
        return "Завершить смену";
      case "break":
        return "Начать перерыв";
      case "resume":
        return "Завершить перерыв";
      default:
        return "Действие";
    }
  }

  // Получение иконки для действия
  getActionIcon(action: string): string {
    switch (action) {
      case "start":
        return "play";
      case "end":
        return "square";
      case "break":
        return "coffee";
      case "resume":
        return "play";
      default:
        return "clock";
    }
  }

  // Получение цвета для статуса
  getStatusColor(status: string): string {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "on_break":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Получение текста для статуса
  getStatusText(status: string): string {
    switch (status) {
      case "planned":
        return "Запланирована";
      case "active":
        return "Активна";
      case "on_break":
        return "На перерыве";
      case "completed":
        return "Завершена";
      case "cancelled":
        return "Отменена";
      default:
        return "Неизвестно";
    }
  }
}

export const webAppService = new WebAppService();
