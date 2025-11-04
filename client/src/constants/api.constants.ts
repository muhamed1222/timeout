/**
 * API Endpoints Constants
 * Centralized location for all API endpoint definitions
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const API_ENDPOINTS = {
  COMPANIES: {
    BASE: (companyId: string) => `/api/companies/${companyId}`,
    STATS: (companyId: string) => `/api/companies/${companyId}/stats`,
    EMPLOYEES: (companyId: string) => `/api/companies/${companyId}/employees`,
    EMPLOYEE_BY_ID: (companyId: string, employeeId: string) => 
      `/api/companies/${companyId}/employees/${employeeId}`,
    INVITES: (companyId: string) => `/api/companies/${companyId}/employee-invites`,
    INVITE_BY_ID: (companyId: string, inviteId: string) => 
      `/api/companies/${companyId}/employee-invites/${inviteId}`,
    SHIFTS: {
      ACTIVE: (companyId: string) => `/api/companies/${companyId}/shifts/active`,
      PLANNED: (companyId: string) => `/api/companies/${companyId}/shifts/planned`,
      BASE: (companyId: string) => `/api/companies/${companyId}/shifts`,
      BY_ID: (companyId: string, shiftId: string) => `/api/companies/${companyId}/shifts/${shiftId}`,
    },
    SCHEDULES: (companyId: string) => `/api/companies/${companyId}/schedule-templates`,
    RATINGS: (companyId: string) => `/api/companies/${companyId}/ratings`,
    EXCEPTIONS: (companyId: string) => `/api/companies/${companyId}/exceptions`,
    VIOLATION_RULES: (companyId: string) => `/api/companies/${companyId}/violation-rules`,
  },
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  EMPLOYEES: {
    BASE: '/api/employees',
    BY_ID: (id: string) => `/api/employees/${id}`,
  },
  INVITES: {
    BASE: '/api/employee-invites',
    BY_ID: (id: string) => `/api/employee-invites/${id}`,
    LINK: (code: string) => `/api/employee-invites/${code}/link`,
  },
  RATING: {
    PERIODS: '/api/rating/periods',
    BY_EMPLOYEE: (employeeId: string) => `/api/rating/employees/${employeeId}`,
  },
} as const;
