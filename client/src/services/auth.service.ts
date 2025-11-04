// Сервис для аутентификации

import { supabase } from "@/lib/supabase";
// Auth types
interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
}

export class AuthService {
  // Вход в систему
  async login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Регистрация
  async register(data: RegisterData): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          company_name: data.company_name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Выход из системы
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  // Получить текущего пользователя
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    return user;
  }

  // Обновить профиль пользователя
  async updateProfile(updates: {
    full_name?: string;
    company_name?: string;
  }): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Сбросить пароль
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Изменить пароль
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const authService = new AuthService();
