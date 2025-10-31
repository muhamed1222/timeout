import { UUID } from '../../../shared/domain/value-objects/UUID';

export interface CreateEmployeeCommand {
  companyId: string;
  fullName: string;
  position: string;
  telegramUserId?: string;
  timezone: string;
}

export interface CreateEmployeeCommandResult {
  employee: {
    id: string;
    companyId: string;
    fullName: string;
    position: string;
    telegramUserId?: string;
    status: string;
    timezone: string;
    createdAt: string;
  };
  inviteCode?: string;
}



