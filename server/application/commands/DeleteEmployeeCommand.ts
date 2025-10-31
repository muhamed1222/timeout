export interface DeleteEmployeeCommand {
  employeeId: string;
  companyId: string;
}

export interface DeleteEmployeeCommandResult {
  success: boolean;
  message: string;
}



