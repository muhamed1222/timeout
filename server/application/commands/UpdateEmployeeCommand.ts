export interface UpdateEmployeeCommand {
  employeeId: string;
  companyId: string;
  fullName?: string;
  position?: string;
  telegramUserId?: string;
  timezone?: string;
  status?: 'active' | 'inactive' | 'terminated';
}

export interface UpdateEmployeeCommandResult {
  employee: {
    id: string;
    companyId: string;
    fullName: string;
    position: string;
    telegramUserId?: string;
    status: string;
    timezone: string;
    updatedAt: string;
  };
}



