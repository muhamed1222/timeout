// Сервис для аутентификации

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { AuthUser, ApiResponse } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  company_name: string;
  full_name: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
  company_id?: string;
}

export class AuthService {
  constructor() {
    // Токены управляются через apiService
  }

  /**
   * Устанавливает токен аутентификации
   */
  setToken(token: string): void {
    apiService.setAuthToken(token);
  }

  /**
   * Получает текущий токен аутентификации
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Устанавливает CSRF токен
   */
  setCSRFToken(token: string): void {
    apiService.setCSRFToken(token);
  }

  /**
   * Получает текущий CSRF токен
   */
  getCSRFToken(): string | null {
    return localStorage.getItem('csrf_token');
  }

  /**
   * Очищает все токены аутентификации
   */
  clearTokens(): void {
    apiService.setAuthToken(null);
    apiService.setCSRFToken(null);
  }

  // Регистрация
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    if (!response.success) {
      throw new Error('Ошибка регистрации');
    }

    // Сохраняем токен
    this.setToken(response.token);

    return response;
  }

  // Вход
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    );

    if (!response.success) {
      throw new Error('Ошибка входа');
    }

    // Сохраняем токен
    this.setToken(response.token);

    return response;
  }

  // Выход
  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      // Очищаем токены в любом случае
      this.clearTokens();
    }
  }

  // Проверка аутентификации
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Получение текущего пользователя
  async getCurrentUser(): Promise<AuthUser> {
    if (!this.isAuthenticated()) {
      throw new Error('Пользователь не аутентифицирован');
    }

    const response = await apiService.get<ApiResponse<AuthUser>>('/auth/me');

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Обновление профиля
  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    const response = await apiService.patch<ApiResponse<AuthUser>>(
      '/auth/profile',
      data
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data!;
  }

  // Смена пароля
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const response = await apiService.post<ApiResponse>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Сброс пароля
  async resetPassword(email: string): Promise<void> {
    const response = await apiService.post<ApiResponse>(
      '/auth/reset-password',
      { email }
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }

  // Подтверждение сброса пароля
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<void> {
    const response = await apiService.post<ApiResponse>(
      '/auth/confirm-password-reset',
      { token, newPassword }
    );

    if (response.error) {
      throw new Error(response.error);
    }
  }
}

export const authService = new AuthService();
export default authService;
