export interface StartShiftCommand {
  shiftId: string;
  companyId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface StartShiftCommandResult {
  shift: {
    id: string;
    employeeId: string;
    companyId: string;
    status: string;
    actualStartAt: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}



