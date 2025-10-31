// Заглушка для EmployeeRepository
import { BaseRepository } from './BaseRepository';

export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string | null;
  created_at: Date | null;
}

export class EmployeeRepository extends BaseRepository<Employee, string> {
  constructor() {
    super('employee');
  }

  protected extractId(entity: Employee): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<Employee>): void {
    if (!entity) {
      throw new Error('Employee entity is required');
    }
  }

  // Заглушки для методов
  protected async findByIdInternal(id: string): Promise<Employee | null> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async findByIdsInternal(ids: string[]): Promise<Employee[]> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async findAllInternal(): Promise<Employee[]> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async createInternal(entity: Partial<Employee>): Promise<Employee> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async updateInternal(id: string, entity: Partial<Employee>): Promise<Employee> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async findByInternal(): Promise<Employee[]> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async findOneInternal(): Promise<Employee | null> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async searchInternal(): Promise<Employee[]> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async countInternal(): Promise<number> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async existsInternal(id: string): Promise<boolean> {
    throw new Error('EmployeeRepository not implemented');
  }

  protected async beginTransactionInternal(): Promise<any> {
    throw new Error('EmployeeRepository not implemented');
  }
}



