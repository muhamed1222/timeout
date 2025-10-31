// Repository для нарушений
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

export interface Violation {
  id: string;
  employee_id: string;
  company_id: string;
  rule_id: string;
  source: string;
  reason?: string;
  penalty: number;
  created_by?: string;
  created_at: string;
}

export class ViolationRepository extends BaseRepository<Violation, string> {
  constructor() {
    super('violations', {
      enableCaching: true,
      cacheTTL: 1800,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  protected extractId(entity: Violation): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<Violation>): void {
    if (!entity) {
      throw new DomainException('Violation entity is required', 'INVALID_VIOLATION');
    }
    if (entity.employee_id && typeof entity.employee_id !== 'string') {
      throw new DomainException('Employee ID must be a string', 'INVALID_EMPLOYEE_ID');
    }
    if (entity.company_id && typeof entity.company_id !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }
  }

  protected async findByIdInternal(id: string): Promise<Violation | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('violations')
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
        `Failed to find violation by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<Violation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('violations')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find violations by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<Violation[]> {
    try {
      let query = supabaseAdmin.from('violations').select('*');
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
        `Failed to find all violations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<Violation>): Promise<Violation> {
    try {
      const violationData = {
        id: entity.id || crypto.randomUUID(),
        employee_id: entity.employee_id,
        company_id: entity.company_id,
        rule_id: entity.rule_id,
        source: entity.source,
        reason: entity.reason,
        penalty: entity.penalty,
        created_by: entity.created_by,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('violations')
        .insert(violationData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create violation: No data returned');
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create violation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<Violation>): Promise<Violation> {
    try {
      const updateData: any = {};
      if (entity.reason !== undefined) updateData.reason = entity.reason;
      if (entity.penalty !== undefined) updateData.penalty = entity.penalty;

      const { data, error } = await supabaseAdmin
        .from('violations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new EntityNotFoundError('Violation', id);
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update violation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('violations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete violation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('violations')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete violations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<Violation[]> {
    try {
      let query = supabaseAdmin.from('violations').select('*');
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
        `Failed to find violations by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<Violation | null> {
    try {
      let query = supabaseAdmin.from('violations').select('*');
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
        `Failed to find violation by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof Violation)[],
    options?: SearchOptions
  ): Promise<Violation[]> {
    try {
      let query = supabaseAdmin.from('violations').select('*');
      if (fields.length > 0) {
        const orConditions = fields.map(field => {
          if (field === 'reason' || field === 'source') {
            return `${String(field)}.ilike.%${searchQuery}%`;
          }
          return null;
        }).filter(Boolean);
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      }
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to search violations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('violations').select('id', { count: 'exact' });
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
        `Failed to count violations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('violations')
        .select('id')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check violation existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async findByEmployeeId(employeeId: string, options?: QueryOptions): Promise<Violation[]> {
    try {
      let query = supabaseAdmin
        .from('violations')
        .select('*, rule:company_violation_rules(name, penalty_percent)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find violations by employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  async findByCompanyId(companyId: string, options?: QueryOptions): Promise<Violation[]> {
    try {
      let query = supabaseAdmin
        .from('violations')
        .select('*, rule:company_violation_rules(name, penalty_percent), employee:employee(full_name, position)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find violations by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




