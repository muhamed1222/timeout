export interface GetActiveShiftsQuery {
  companyId: string;
  employeeId?: string;
}

export interface GetActiveShiftsQueryResult {
  shifts: Array<{
    id: string;
    employeeId: string;
    companyId: string;
    plannedStartAt: string;
    plannedEndAt: string;
    actualStartAt?: string;
    actualEndAt?: string;
    status: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
  }>;
}



