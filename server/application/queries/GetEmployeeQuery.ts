export interface GetEmployeeQuery {
  employeeId: string;
  companyId: string;
}

export interface GetEmployeeQueryResult {
  employee: {
    id: string;
    companyId: string;
    fullName: string;
    position: string;
    telegramUserId?: string;
    status: string;
    timezone: string;
    createdAt: string;
    updatedAt?: string;
  };
}



