// Улучшенный Repository для приглашений сотрудников
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

export interface EmployeeInvite {
  id: string;
  company_id: string;
  code: string;
  full_name: string;
  position: string;
  tz?: string;
  expires_at: string;
  created_at: string | null;
  used_by_employee: string | null;
  used_at: Date | null;
}

export class ImprovedEmployeeInviteRepository extends BaseRepository<EmployeeInvite, string> {
  constructor() {
    super('employee_invite', {
      enableCaching: true,
      cacheTTL: 3600,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  // Реализация абстрактных методов
  protected extractId(entity: EmployeeInvite): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<EmployeeInvite>): void {
    if (!entity) {
      throw new DomainException('EmployeeInvite entity is required', 'INVALID_INVITE');
    }

    if (entity.code && typeof entity.code !== 'string') {
      throw new DomainException('Invite code must be a string', 'INVALID_CODE');
    }

    if (entity.full_name && typeof entity.full_name !== 'string') {
      throw new DomainException('Full name must be a string', 'INVALID_FULL_NAME');
    }

    if (entity.company_id && typeof entity.company_id !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }
  }

  // Внутренние методы для работы с базой данных
  protected async findByIdInternal(id: string): Promise<EmployeeInvite | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Не найдено
        }
        throw error;
      }

      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find invite by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<EmployeeInvite[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('*')
        .in('id', ids);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find invites by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<EmployeeInvite[]> {
    try {
      let query = supabaseAdmin.from('employee_invite').select('*');

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      if (options?.orderBy) {
        const direction = options.orderDirection || 'ASC';
        query = query.order(options.orderBy, { ascending: direction === 'ASC' });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find all invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<EmployeeInvite>): Promise<EmployeeInvite> {
    try {
      // Проверяем уникальность code
      if (entity.code) {
        const existing = await this.findByCodeInternal(entity.code);
        if (existing) {
          throw new DuplicateEntityError('EmployeeInvite', 'code', entity.code);
        }
      }

      const inviteData = {
        id: entity.id || crypto.randomUUID(),
        company_id: entity.company_id,
        code: entity.code,
        full_name: entity.full_name,
        position: entity.position,
        tz: entity.tz,
        expires_at: entity.expires_at,
        created_at: new Date().toISOString(),
        used_by_employee: null,
        used_at: null
      };

      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .insert(inviteData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create invite: No data returned');
      }

      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to create invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<EmployeeInvite>): Promise<EmployeeInvite> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (entity.full_name !== undefined) updateData.full_name = entity.full_name;
      if (entity.position !== undefined) updateData.position = entity.position;
      if (entity.tz !== undefined) updateData.tz = entity.tz;
      if (entity.expires_at !== undefined) updateData.expires_at = entity.expires_at;
      if (entity.used_by_employee !== undefined) updateData.used_by_employee = entity.used_by_employee;
      if (entity.used_at !== undefined) updateData.used_at = entity.used_at;

      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new EntityNotFoundError('EmployeeInvite', id);
      }

      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to update invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('employee_invite')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('employee_invite')
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters?: FilterOptions): Promise<EmployeeInvite[]> {
    try {
      let query = supabaseAdmin.from('employee_invite').select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find invites by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters?: FilterOptions): Promise<EmployeeInvite | null> {
    try {
      let query = supabaseAdmin.from('employee_invite').select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find invite by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(
    searchQuery: string,
    fields: (keyof EmployeeInvite)[],
    options?: SearchOptions
  ): Promise<EmployeeInvite[]> {
    try {
      let query = supabaseAdmin.from('employee_invite').select('*');

      // Поиск по текстовым полям
      if (fields.length > 0) {
        const orConditions = fields.map(field => {
          if (field === 'full_name' || field === 'position' || field === 'code') {
            return `${String(field)}.ilike.%${searchQuery}%`;
          }
          return null;
        }).filter(Boolean);

        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to search invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('employee_invite').select('id', { count: 'exact' });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to count invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check invite existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async beginTransactionInternal(): Promise<Transaction> {
    // Supabase не поддерживает транзакции напрямую в клиенте
    // Возвращаем заглушку
    return {
      commit: async () => {},
      rollback: async () => {}
    } as Transaction;
  }

  // Дополнительные методы для работы с приглашениями

  // Найти приглашение по коду
  async findByCode(code: string): Promise<EmployeeInvite | null> {
    return this.findByCodeInternal(code);
  }

  private async findByCodeInternal(code: string): Promise<EmployeeInvite | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find invite by code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Найти все приглашения компании
  async findByCompanyId(companyId: string): Promise<EmployeeInvite[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find invites by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Найти активные (неиспользованные и не истекшие) приглашения
  async findActiveByCompanyId(companyId: string): Promise<EmployeeInvite[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .select('*')
        .eq('company_id', companyId)
        .is('used_by_employee', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find active invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Отметить приглашение как использованное
  async markAsUsed(id: string, employeeId: string): Promise<EmployeeInvite> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_invite')
        .update({
          used_by_employee: employeeId,
          used_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new EntityNotFoundError('EmployeeInvite', id);
      }

      return data;
    } catch (error) {
      throw new DomainException(
        `Failed to mark invite as used: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Удалить истекшие приглашения
  async deleteExpiredInvites(): Promise<number> {
    try {
      const { error, count } = await supabaseAdmin
        .from('employee_invite')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .is('used_by_employee', null);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to delete expired invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




