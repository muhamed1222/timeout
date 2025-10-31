export interface GetDashboardStatsQuery {
  companyId: string;
}

export interface GetDashboardStatsQueryResult {
  stats: {
    totalEmployees: number;
    activeShifts: number;
    completedShifts: number;
    exceptions: number;
    averageShiftDuration: number;
    onTimeRate: number;
  };
}



