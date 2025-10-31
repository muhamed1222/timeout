// Базовый API сервис для всех HTTP запросов

import {
  API_BASE_URL,
  HTTP_METHODS,
  HTTP_STATUS,
} from '../constants/api.constants';
// AppError не найден, создаем локально
export class AppError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AppError';
  }
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: any = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: any = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.error || `HTTP ${response.status}`,
          errorData.message || response.statusText,
          { status: response.status, endpoint }
        );
      }

      // Если ответ пустой (204 No Content)
      if (response.status === HTTP_STATUS.NO_CONTENT) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      // Сетевые ошибки
      throw new AppError(
        'NETWORK_ERROR',
        'Ошибка сети. Проверьте подключение к интернету.',
        { originalError: error, endpoint }
      );
    }
  }

  // GET запрос
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? this.buildUrlWithParams(endpoint, params) : endpoint;
    return this.request<T>(url, { method: HTTP_METHODS.GET });
  }

  // POST запрос
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HTTP_METHODS.POST,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT запрос
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HTTP_METHODS.PUT,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH запрос
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: HTTP_METHODS.PATCH,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE запрос
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: HTTP_METHODS.DELETE });
  }

  // Построение URL с параметрами
  private buildUrlWithParams(
    endpoint: string,
    params: Record<string, any>
  ): string {
    const url = new URL(endpoint, window.location.origin);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.pathname + url.search;
  }

  // Загрузка файла
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      method: HTTP_METHODS.POST,
      body: formData,
      headers: {}, // Убираем Content-Type для FormData
    });
  }

  // Скачивание файла
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await fetch(`${this.baseURL}${endpoint}`);

    if (!response.ok) {
      throw new AppError('DOWNLOAD_ERROR', 'Ошибка при скачивании файла', {
        status: response.status,
      });
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Экспортируем singleton instance
export const apiService = new ApiService();
export default apiService;
