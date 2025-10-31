// Заглушка для ShiftRepository
import { BaseRepository } from './BaseRepository';

export interface Shift {
  id: string;
  employee_id: string;
  company_id: string;
  planned_start_at: Date;
  planned_end_at: Date;
  actual_start_at: Date | null;
  actual_end_at: Date | null;
  status: string;
  created_at: Date | null;
}

export class ShiftRepository extends BaseRepository<Shift, string> {
  constructor() {
    super('shift');
  }

  protected extractId(entity: Shift): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<Shift>): void {
    if (!entity) {
      throw new Error('Shift entity is required');
    }
  }

  // Заглушки для методов
  protected async findByIdInternal(id: string): Promise<Shift | null> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async findByIdsInternal(ids: string[]): Promise<Shift[]> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async findAllInternal(): Promise<Shift[]> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async createInternal(entity: Partial<Shift>): Promise<Shift> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async updateInternal(id: string, entity: Partial<Shift>): Promise<Shift> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async findByInternal(): Promise<Shift[]> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async findOneInternal(): Promise<Shift | null> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async searchInternal(): Promise<Shift[]> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async countInternal(): Promise<number> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async existsInternal(id: string): Promise<boolean> {
    throw new Error('ShiftRepository not implemented');
  }

  protected async beginTransactionInternal(): Promise<any> {
    throw new Error('ShiftRepository not implemented');
  }
}



