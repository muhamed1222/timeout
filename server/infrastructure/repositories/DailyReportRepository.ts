// Repository для ежедневных отчетов
import { BaseRepository } from './BaseRepository';
import { 
  QueryOptions, 
  FilterOptions, 
  SearchOptions, 
  Transaction,
  EntityNotFoundError
} from './RepositoryInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { supabaseAdmin } from '../../lib/supabase';

export interface DailyReport {
  id: string;
  shift_id: string;
  planned_items?: string[];
  done_items?: string[];
  blockers?: string;
  tasks_links?: string[];
  time_spent?: any;
  attachments?: any;
  submitted_at?: string;
}

export class DailyReportRepository extends BaseRepository<DailyReport, string> {
  constructor() {
    super('daily_report', {
      enableCaching: true,
      cacheTTL: 1800,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  protected extractId(entity: DailyReport): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<DailyReport>): void {
    if (!entity) {
      throw new DomainException('DailyReport entity is required', 'INVALID_REPORT');
    }
    if (entity.shift_id && typeof entity.shift_id !== 'string') {
      throw new DomainException('Shift ID must be a string', 'INVALID_SHIFT_ID');
    }
  }

  protected async findByIdInternal(id: string): Promise<DailyReport | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('daily_report')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find daily report by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<DailyReport[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('daily_report')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find daily reports by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<DailyReport[]> {
    try {
      let query = supabaseAdmin.from('daily_report').select('*');
      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options?.orderBy) {
        const direction = options.orderDirection || 'ASC';
        query = query.order(options.orderBy, { ascending: direction === 'ASC' });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find all daily reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<DailyReport>): Promise<DailyReport> {
    try {
      const reportData = {
        id: entity.id || crypto.randomUUID(),
        shift_id: entity.shift_id,
        planned_items: entity.planned_items,
        done_items: entity.done_items,
        blockers: entity.blockers,
        tasks_links: entity.tasks_links,
        time_spent: entity.time_spent,
        attachments: entity.attachments,
        submitted_at: entity.submitted_at || new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('daily_report')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create daily report: No data returned');
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create daily report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<DailyReport>): Promise<DailyReport> {
    try {
      const updateData: any = {};
      if (entity.planned_items !== undefined) updateData.planned_items = entity.planned_items;
      if (entity.done_items !== undefined) updateData.done_items = entity.done_items;
      if (entity.blockers !== undefined) updateData.blockers = entity.blockers;
      if (entity.tasks_links !== undefined) updateData.tasks_links = entity.tasks_links;
      if (entity.time_spent !== undefined) updateData.time_spent = entity.time_spent;
      if (entity.attachments !== undefined) updateData.attachments = entity.attachments;

      const { data, error } = await supabaseAdmin
        .from('daily_report')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new EntityNotFoundError('DailyReport', id);
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update daily report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('daily_report')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete daily report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('daily_report')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete daily reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<DailyReport[]> {
    try {
      let query = supabaseAdmin.from('daily_report').select('*');
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find daily reports by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<DailyReport | null> {
    try {
      let query = supabaseAdmin.from('daily_report').select('*');
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      const { data, error } = await query.single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find daily report by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof DailyReport)[],
    options?: SearchOptions
  ): Promise<DailyReport[]> {
    try {
      let query = supabaseAdmin.from('daily_report').select('*');
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to search daily reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('daily_report').select('id', { count: 'exact' });
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to count daily reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('daily_report')
        .select('id')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check daily report existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async beginTransactionInternal(): Promise<Transaction> {
    return {
      commit: async () => {},
      rollback: async () => {}
    } as Transaction;
  }

  // Дополнительные методы

  async findByShiftId(shiftId: string): Promise<DailyReport | null> {
    return this.findOneInternal({ shift_id: shiftId });
  }

  async findByCompanyId(companyId: string, options?: QueryOptions): Promise<DailyReport[]> {
    try {
      // Получаем все смены компании через сотрудников
      const { data: employees, error: empError } = await supabaseAdmin
        .from('employee')
        .select('id')
        .eq('company_id', companyId);
      
      if (empError) throw empError;
      if (!employees || employees.length === 0) return [];
      
      const employeeIds = employees.map(e => e.id);

      // Получаем смены этих сотрудников
      const { data: shifts, error: shiftsError } = await supabaseAdmin
        .from('shift')
        .select('id')
        .in('employee_id', employeeIds);
      
      if (shiftsError) throw shiftsError;
      if (!shifts || shifts.length === 0) return [];
      
      const shiftIds = shifts.map(s => s.id);

      // Получаем отчеты для этих смен
      let query = supabaseAdmin
        .from('daily_report')
        .select('*, shift:shift(employee_id, planned_start_at, planned_end_at)')
        .in('shift_id', shiftIds)
        .order('submitted_at', { ascending: false });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find daily reports by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




