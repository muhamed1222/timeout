export interface EndShiftCommand {
  shiftId: string;
  companyId: string;
  notes?: string;
}

export interface EndShiftCommandResult {
  shift: {
    id: string;
    employeeId: string;
    companyId: string;
    status: string;
    actualEndAt: string;
    notes?: string;
  };
}



