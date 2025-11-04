/**
 * Централизованные типы для клиентского приложения
 * Все типы должны быть определены здесь для переиспользования
 */

import type { Employee, EmployeeInvite, Shift } from "@outcasts/shared/schema";

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

/**
 * Данные авторизованного пользователя
 */
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Опции фильтрации
 */
export interface FilterOptions {
  status?: string;
  search?: string;
  [key: string]: unknown;
}

/**
 * Опции сортировки
 */
export interface SortOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}

/**
 * Опции пагинации
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Статистика компании для дашборда
 */
export interface CompanyStats {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
}

/**
 * Активная смена с данными сотрудника
 */
export interface ActiveShift {
  id: string;
  employee_id: string;
  employee: {
    full_name: string;
    position: string | null;
  };
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  status: string;
}

/**
 * Данные для таблицы смен
 */
export interface ShiftRow {
  id: string;
  employeeName: string;
  position: string;
  startedAt: string;
  rating: string;
  status: "active" | "break" | "completed";
}

// ============================================================================
// Employee Types
// ============================================================================

/**
 * Расширенный тип сотрудника для отображения
 */
export interface EmployeeDisplay {
  id: string;
  company_id: string;
  created_at: Date | null;
  full_name: string;
  position: string | null;
  telegram_user_id: string | null;
  tz: string | null;
  status?: string; // Optional status for display purposes
  avatar_id?: number | null;
  photo_url?: string | null;
}

/**
 * Приглашение с ссылкой
 */
export interface InviteLink {
  code: string;
  deep_link: string;
  qr_code_url: string;
}

// ============================================================================
// Re-exports from shared schema
// ============================================================================

export type { Employee, EmployeeInvite, Shift };

