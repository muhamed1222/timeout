// Заглушка для EmployeeInviteRepository
import { BaseRepository } from './BaseRepository';

export interface EmployeeInvite {
  id: string;
  company_id: string;
  code: string;
  full_name: string;
  position: string;
  created_at: Date | null;
  used_by_employee: string | null;
  used_at: Date | null;
}

export class EmployeeInviteRepository extends BaseRepository<EmployeeInvite, string> {
  constructor() {
    super('employee_invite');
  }

  protected extractId(entity: EmployeeInvite): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<EmployeeInvite>): void {
    if (!entity) {
      throw new Error('EmployeeInvite entity is required');
    }
  }

  // Заглушки для методов
  protected async findByIdInternal(id: string): Promise<EmployeeInvite | null> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async findByIdsInternal(ids: string[]): Promise<EmployeeInvite[]> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async findAllInternal(): Promise<EmployeeInvite[]> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async createInternal(entity: Partial<EmployeeInvite>): Promise<EmployeeInvite> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async updateInternal(id: string, entity: Partial<EmployeeInvite>): Promise<EmployeeInvite> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async findByInternal(): Promise<EmployeeInvite[]> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async findOneInternal(): Promise<EmployeeInvite | null> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async searchInternal(): Promise<EmployeeInvite[]> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async countInternal(): Promise<number> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async existsInternal(id: string): Promise<boolean> {
    throw new Error('EmployeeInviteRepository not implemented');
  }

  protected async beginTransactionInternal(): Promise<any> {
    throw new Error('EmployeeInviteRepository not implemented');
  }
}



