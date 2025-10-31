// Repository для рейтингов сотрудников
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

export interface EmployeeRating {
  id: string;
  employee_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  rating: number;
  status: string;
  updated_at: string;
}

export class EmployeeRatingRepository extends BaseRepository<EmployeeRating, string> {
  constructor() {
    super('employee_rating', {
      enableCaching: true,
      cacheTTL: 1800,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  protected extractId(entity: EmployeeRating): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<EmployeeRating>): void {
    if (!entity) {
      throw new DomainException('EmployeeRating entity is required', 'INVALID_RATING');
    }
    if (entity.employee_id && typeof entity.employee_id !== 'string') {
      throw new DomainException('Employee ID must be a string', 'INVALID_EMPLOYEE_ID');
    }
    if (entity.company_id && typeof entity.company_id !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }
  }

  protected async findByIdInternal(id: string): Promise<EmployeeRating | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_rating')
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
        `Failed to find employee rating by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<EmployeeRating[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employee ratings by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<EmployeeRating[]> {
    try {
      let query = supabaseAdmin.from('employee_rating').select('*');
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
        `Failed to find all employee ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<EmployeeRating>): Promise<EmployeeRating> {
    try {
      const ratingData = {
        id: entity.id || crypto.randomUUID(),
        employee_id: entity.employee_id,
        company_id: entity.company_id,
        period_start: entity.period_start,
        period_end: entity.period_end,
        rating: entity.rating ?? 100,
        status: entity.status || 'active',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .insert(ratingData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create employee rating: No data returned');
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create employee rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<EmployeeRating>): Promise<EmployeeRating> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (entity.rating !== undefined) updateData.rating = entity.rating;
      if (entity.status !== undefined) updateData.status = entity.status;
      if (entity.period_end !== undefined) updateData.period_end = entity.period_end;

      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new EntityNotFoundError('EmployeeRating', id);
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update employee rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('employee_rating')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete employee rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('employee_rating')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete employee ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<EmployeeRating[]> {
    try {
      let query = supabaseAdmin.from('employee_rating').select('*');
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
        `Failed to find employee ratings by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<EmployeeRating | null> {
    try {
      let query = supabaseAdmin.from('employee_rating').select('*');
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
        `Failed to find employee rating by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof EmployeeRating)[],
    options?: SearchOptions
  ): Promise<EmployeeRating[]> {
    try {
      let query = supabaseAdmin.from('employee_rating').select('*');
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to search employee ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('employee_rating').select('id', { count: 'exact' });
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
        `Failed to count employee ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .select('id')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check employee rating existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async findByEmployeeId(employeeId: string): Promise<EmployeeRating[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .select('*')
        .eq('employee_id', employeeId)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employee ratings by employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  async findByCompanyId(companyId: string, options?: QueryOptions): Promise<EmployeeRating[]> {
    try {
      let query = supabaseAdmin
        .from('employee_rating')
        .select('*, employee:employee(full_name, position)')
        .eq('company_id', companyId)
        .order('period_start', { ascending: false });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employee ratings by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  async findCurrentByEmployeeId(employeeId: string): Promise<EmployeeRating | null> {
    try {
      const now = new Date().toISOString().split('T')[0];
      const { data, error } = await supabaseAdmin
        .from('employee_rating')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .lte('period_start', now)
        .gte('period_end', now)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find current employee rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




