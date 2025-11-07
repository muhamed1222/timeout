import type {
  Shift,
  Employee,
  EmployeeRating,
  CompanyViolationRules,
} from "@outcasts/shared/schema.js";

const MOCK_EMPLOYEES: Array<Pick<Employee, "id" | "full_name" | "position" | "company_id" | "status">> = [
  {
    id: "mock-emp-1",
    company_id: "mock-company",
    full_name: "Иван Венгер",
    position: "Менеджер",
    status: "active",
  },
  {
    id: "mock-emp-2",
    company_id: "mock-company",
    full_name: "Мария Романова",
    position: "Супервайзер",
    status: "active",
  },
];

export interface MockCompanyStats {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
}

export function getMockCompanyStats(_companyId: string): MockCompanyStats {
  return {
    totalEmployees: MOCK_EMPLOYEES.length,
    activeShifts: 1,
    completedShifts: 5,
    exceptions: 2,
  };
}

export type MockActiveShift = Shift & {
  employee: Pick<Employee, "id" | "full_name" | "position" | "photo_url" | "avatar_id">;
};

export function getMockActiveShifts(_companyId: string): MockActiveShift[] {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 60 * 1000);
  const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  return [
    {
      id: "mock-shift-1",
      employee_id: MOCK_EMPLOYEES[0].id,
      planned_start_at: start,
      planned_end_at: end,
      actual_start_at: start,
      actual_end_at: null,
      status: "active",
      created_at: new Date(start.getTime() - 24 * 60 * 60 * 1000),
      employee: {
        id: MOCK_EMPLOYEES[0].id,
        full_name: MOCK_EMPLOYEES[0].full_name,
        position: MOCK_EMPLOYEES[0].position,
        photo_url: null,
        avatar_id: null,
      },
    },
  ] as MockActiveShift[];
}

export function getMockEmployees(companyId: string): Array<Pick<Employee, "id" | "company_id" | "full_name" | "position" | "status" | "avatar_id" | "photo_url">> {
  return MOCK_EMPLOYEES.map((emp) => ({
    id: emp.id,
    company_id: companyId,
    full_name: emp.full_name,
    position: emp.position,
    status: emp.status,
    avatar_id: null,
    photo_url: null,
  }));
}

export function getMockViolationRules(companyId: string): CompanyViolationRules[] {
  return [
    {
      id: "mock-rule-1",
      company_id: companyId,
      code: "late",
      name: "Опоздание",
      penalty_percent: "5" as unknown as number, // drizzle numeric typed as any
      auto_detectable: true,
      is_active: true,
      created_at: new Date(),
    },
    {
      id: "mock-rule-2",
      company_id: companyId,
      code: "no_report",
      name: "Нет отчета",
      penalty_percent: "10" as unknown as number,
      auto_detectable: false,
      is_active: true,
      created_at: new Date(),
    },
  ];
}

export type MockEmployeeRating = EmployeeRating;

export function getMockRatings(companyId: string): MockEmployeeRating[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  return [
    {
      id: "mock-rating-1",
      employee_id: MOCK_EMPLOYEES[0].id,
      company_id: companyId,
      period_start: start,
      period_end: end,
      rating: "92",
      status: "active",
      updated_at: today,
    },
    {
      id: "mock-rating-2",
      employee_id: MOCK_EMPLOYEES[1].id,
      company_id: companyId,
      period_start: start,
      period_end: end,
      rating: "76",
      status: "active",
      updated_at: today,
    },
  ];
}
