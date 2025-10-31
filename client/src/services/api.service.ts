// Базовый API сервис для всех HTTP запросов

import {
  API_BASE_URL,
  HTTP_METHODS,
  HTTP_STATUS,
} from '../constants/api.constants';
import { supabase } from '../lib/supabase';
// Типы для fetch API
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  cache?: 'default' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
  credentials?: 'omit' | 'same-origin' | 'include';
  mode?: 'cors' | 'no-cors' | 'same-origin';
  redirect?: 'follow' | 'error' | 'manual';
  referrer?: string;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  signal?: AbortSignal;
}

// Класс ошибки приложения
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ApiService {
  private readonly baseURL: string;
  private authToken: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadTokensFromStorage();
  }

  /**
   * Загружает токены из localStorage при инициализации
   */
  private loadTokensFromStorage(): void {
    // Ищем токен Supabase в localStorage
    const supabaseSession = this.getSupabaseToken();
    this.authToken = supabaseSession || localStorage.getItem('auth_token');
    this.csrfToken = localStorage.getItem('csrf_token');
  }

  /**
   * Получает токен из Supabase session
   */
  private getSupabaseToken(): string | null {
    try {
      // Ищем ключ Supabase в localStorage (формат: sb-<project-id>-auth-token)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            return parsed?.access_token || null;
          }
        }
      }
    } catch (error) {
      console.error('Error getting Supabase token:', error);
    }
    return null;
  }

  /**
   * Устанавливает токен аутентификации
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    this.updateTokenInStorage('auth_token', token);
  }

  /**
   * Устанавливает CSRF токен
   */
  setCSRFToken(token: string | null): void {
    this.csrfToken = token;
    this.updateTokenInStorage('csrf_token', token);
  }

  /**
   * Обновляет токен в localStorage
   */
  private updateTokenInStorage(key: string, token: string | null): void {
    if (token) {
      localStorage.setItem(key, token);
    } else {
      localStorage.removeItem(key);
    }
  }

  // Получение заголовков для запросов
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Получаем токен из Supabase сессии
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Добавляем токен аутентификации
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Добавляем CSRF токен для изменяющих запросов
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        ...(await this.getHeaders()),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Обработка ошибок аутентификации
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        // Очищаем токены при ошибке аутентификации
        this.setAuthToken(null);
        this.setCSRFToken(null);

        // НЕ делаем window.location.href, чтобы избежать перезагрузки страницы
        // Вместо этого просто выбрасываем ошибку, которую обработает React Query
        // и компонент App.tsx сделает редирект через роутер
        
        throw new AppError(
          'UNAUTHORIZED',
          'Сессия истекла. Пожалуйста, войдите снова.',
          { status: response.status, endpoint }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.error || `HTTP ${response.status}`,
          errorData.message || response.statusText,
          { status: response.status, endpoint }
        );
      }

      // Проверяем заголовок CSRF токена
      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        this.setCSRFToken(csrfToken);
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
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const url = params ? this.buildUrlWithParams(endpoint, params) : endpoint;
    return this.request<T>(url, { method: HTTP_METHODS.GET });
  }

  // POST запрос
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: HTTP_METHODS.POST,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT запрос
  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: HTTP_METHODS.PUT,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH запрос
  async patch<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
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
    params: Record<string, string | number | boolean>
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
    additionalData?: Record<string, string | number | boolean>
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
      body: formData as any,
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
