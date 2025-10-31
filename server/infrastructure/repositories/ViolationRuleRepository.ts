// Repository для правил нарушений
import { BaseRepository } from './BaseRepository';
import { 
  QueryOptions, 
  FilterOptions, 
  SearchOptions, 
  Transaction,
  EntityNotFoundError,
  DuplicateEntityError
} from './RepositoryInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { supabaseAdmin } from '../../lib/supabase';

export interface ViolationRule {
  id: string;
  company_id: string;
  code: string;
  name: string;
  penalty_percent: number;
  auto_detectable: boolean;
  is_active: boolean;
  created_at: string;
}

export class ViolationRuleRepository extends BaseRepository<ViolationRule, string> {
  constructor() {
    super('company_violation_rules', {
      enableCaching: true,
      cacheTTL: 3600,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  protected extractId(entity: ViolationRule): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<ViolationRule>): void {
    if (!entity) {
      throw new DomainException('ViolationRule entity is required', 'INVALID_RULE');
    }
    if (entity.company_id && typeof entity.company_id !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }
    if (entity.code && typeof entity.code !== 'string') {
      throw new DomainException('Code must be a string', 'INVALID_CODE');
    }
  }

  protected async findByIdInternal(id: string): Promise<ViolationRule | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
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
        `Failed to find violation rule by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<ViolationRule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find violation rules by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<ViolationRule[]> {
    try {
      let query = supabaseAdmin.from('company_violation_rules').select('*');
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
        `Failed to find all violation rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<ViolationRule>): Promise<ViolationRule> {
    try {
      const ruleData = {
        id: entity.id || crypto.randomUUID(),
        company_id: entity.company_id,
        code: entity.code,
        name: entity.name,
        penalty_percent: entity.penalty_percent,
        auto_detectable: entity.auto_detectable ?? false,
        is_active: entity.is_active ?? true,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .insert(ruleData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create violation rule: No data returned');
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create violation rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<ViolationRule>): Promise<ViolationRule> {
    try {
      const updateData: any = {};
      if (entity.name !== undefined) updateData.name = entity.name;
      if (entity.penalty_percent !== undefined) updateData.penalty_percent = entity.penalty_percent;
      if (entity.auto_detectable !== undefined) updateData.auto_detectable = entity.auto_detectable;
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active;

      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new EntityNotFoundError('ViolationRule', id);
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update violation rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('company_violation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete violation rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('company_violation_rules')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete violation rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<ViolationRule[]> {
    try {
      let query = supabaseAdmin.from('company_violation_rules').select('*');
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
        `Failed to find violation rules by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<ViolationRule | null> {
    try {
      let query = supabaseAdmin.from('company_violation_rules').select('*');
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
        `Failed to find violation rule by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof ViolationRule)[],
    options?: SearchOptions
  ): Promise<ViolationRule[]> {
    try {
      let query = supabaseAdmin.from('company_violation_rules').select('*');
      if (fields.length > 0) {
        const orConditions = fields.map(field => {
          if (field === 'name' || field === 'code') {
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
        `Failed to search violation rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('company_violation_rules').select('id', { count: 'exact' });
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
        `Failed to count violation rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .select('id')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check violation rule existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  // Методы для работы с правилами нарушений

  async findByCompanyId(companyId: string): Promise<ViolationRule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find violation rules by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  async findActiveByCompanyId(companyId: string): Promise<ViolationRule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('company_violation_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find active violation rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




