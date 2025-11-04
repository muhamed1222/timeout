/**
 * Common types for client application
 */

import type { Employee, EmployeeInvite } from "@shared/schema";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
}

export interface FilterOptions {
  status?: string;
  search?: string;
  [key: string]: unknown;
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

// Re-export shared types for convenience
export type { Employee, EmployeeInvite };
import type { Shift } from "@shared/schema";
export type { Shift };

// Re-export all types from types/index.ts
// This file is kept for backward compatibility
// All types are now in types/index.ts
export type { CompanyStats, ActiveShift, ShiftRow, EmployeeDisplay, InviteLink } from "./types/index";
