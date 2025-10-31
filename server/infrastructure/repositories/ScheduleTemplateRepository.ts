// Repository для шаблонов графиков
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

export interface ScheduleTemplate {
  id: string;
  company_id: string;
  name: string;
  rules: any; // jsonb
  created_at: string;
}

export class ScheduleTemplateRepository extends BaseRepository<ScheduleTemplate, string> {
  constructor() {
    super('schedule_template', {
      enableCaching: true,
      cacheTTL: 3600,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  protected extractId(entity: ScheduleTemplate): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<ScheduleTemplate>): void {
    if (!entity) {
      throw new DomainException('ScheduleTemplate entity is required', 'INVALID_TEMPLATE');
    }
    if (entity.company_id && typeof entity.company_id !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }
  }

  protected async findByIdInternal(id: string): Promise<ScheduleTemplate | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('schedule_template')
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
        `Failed to find schedule template by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<ScheduleTemplate[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('schedule_template')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find schedule templates by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<ScheduleTemplate[]> {
    try {
      let query = supabaseAdmin.from('schedule_template').select('*');
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
        `Failed to find all schedule templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<ScheduleTemplate>): Promise<ScheduleTemplate> {
    try {
      const templateData = {
        id: entity.id || crypto.randomUUID(),
        company_id: entity.company_id,
        name: entity.name,
        rules: entity.rules,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('schedule_template')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create schedule template: No data returned');
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create schedule template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<ScheduleTemplate>): Promise<ScheduleTemplate> {
    try {
      const updateData: any = {};
      if (entity.name !== undefined) updateData.name = entity.name;
      if (entity.rules !== undefined) updateData.rules = entity.rules;

      const { data, error } = await supabaseAdmin
        .from('schedule_template')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new EntityNotFoundError('ScheduleTemplate', id);
      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update schedule template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('schedule_template')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete schedule template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('schedule_template')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete schedule templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<ScheduleTemplate[]> {
    try {
      let query = supabaseAdmin.from('schedule_template').select('*');
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
        `Failed to find schedule templates by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<ScheduleTemplate | null> {
    try {
      let query = supabaseAdmin.from('schedule_template').select('*');
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
        `Failed to find schedule template by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof ScheduleTemplate)[],
    options?: SearchOptions
  ): Promise<ScheduleTemplate[]> {
    try {
      let query = supabaseAdmin.from('schedule_template').select('*');
      if (fields.includes('name')) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to search schedule templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('schedule_template').select('id', { count: 'exact' });
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
        `Failed to count schedule templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('schedule_template')
        .select('id')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check schedule template existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async findByCompanyId(companyId: string): Promise<ScheduleTemplate[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('schedule_template')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find schedule templates by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




