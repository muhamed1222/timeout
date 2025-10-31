// Улучшенный Repository для сотрудников
import { BaseRepository } from './BaseRepository';
import { 
  QueryOptions, 
  FilterOptions, 
  SearchOptions, 
  Transaction,
  EntityNotFoundError,
  DuplicateEntityError
} from './RepositoryInterface';
import { Employee } from '../../../shared/domain/entities/Employee';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { supabaseAdmin } from '../../lib/supabase';

export class ImprovedEmployeeRepository extends BaseRepository<Employee, string> {
  constructor() {
    super('employee', {
      enableCaching: true,
      cacheTTL: 3600,
      enableLogging: true,
      enableMetrics: true,
      batchSize: 50
    });
  }

  // Реализация абстрактных методов
  protected extractId(entity: Employee): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<Employee>): void {
    if (!entity) {
      throw new DomainException('Employee entity is required', 'INVALID_EMPLOYEE');
    }

    if (entity.fullName && typeof entity.fullName !== 'string') {
      throw new DomainException('Full name must be a string', 'INVALID_FULL_NAME');
    }

    if (entity.position && typeof entity.position !== 'string') {
      throw new DomainException('Position must be a string', 'INVALID_POSITION');
    }

    if (entity.companyId && typeof entity.companyId !== 'string') {
      throw new DomainException('Company ID must be a string', 'INVALID_COMPANY_ID');
    }

    if (entity.telegramUserId && typeof entity.telegramUserId !== 'string') {
      throw new DomainException('Telegram user ID must be a string', 'INVALID_TELEGRAM_USER_ID');
    }
  }

  // Внутренние методы для работы с базой данных
  protected async findByIdInternal(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Не найдено
        }
        throw error;
      }

      return data ? Employee.fromPersistence(data) : null;
    } catch (error) {
      throw new DomainException(
        `Failed to find employee by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByIdsInternal(ids: string[]): Promise<Employee[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee')
        .select('*')
        .in('id', ids);

      if (error) {
        throw error;
      }

      return data ? data.map(item => Employee.fromPersistence(item)) : [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employees by ids: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findAllInternal(options?: QueryOptions): Promise<Employee[]> {
    try {
      let query = supabaseAdmin.from('employee').select('*');

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

      return data ? data.map(item => Employee.fromPersistence(item)) : [];
    } catch (error) {
      throw new DomainException(
        `Failed to find all employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async createInternal(entity: Partial<Employee>): Promise<Employee> {
    try {
      // Проверяем уникальность telegram_user_id
      if (entity.telegramUserId) {
        const existing = await this.findByTelegramIdInternal(entity.telegramUserId);
        if (existing) {
          throw new DuplicateEntityError('Employee', 'telegram_user_id', entity.telegramUserId);
        }
      }

      const employeeData = {
        id: entity.id || crypto.randomUUID(),
        full_name: entity.fullName,
        position: entity.position,
        company_id: entity.companyId,
        telegram_user_id: entity.telegramUserId,
        is_active: entity.isActive ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('employee')
        .insert(employeeData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return Employee.fromPersistence(data);
    } catch (error) {
      if (error instanceof DuplicateEntityError) {
        throw error;
      }
      throw new DomainException(
        `Failed to create employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async updateInternal(id: string, entity: Partial<Employee>): Promise<Employee> {
    try {
      // Проверяем существование
      const existing = await this.findByIdInternal(id);
      if (!existing) {
        throw new EntityNotFoundError(id, 'Employee');
      }

      // Проверяем уникальность telegram_user_id если он изменился
      if (entity.telegramUserId && entity.telegramUserId !== existing.telegramUserId) {
        const duplicate = await this.findByTelegramIdInternal(entity.telegramUserId);
        if (duplicate) {
          throw new DuplicateEntityError('Employee', 'telegram_user_id', entity.telegramUserId);
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (entity.fullName !== undefined) updateData.full_name = entity.fullName;
      if (entity.position !== undefined) updateData.position = entity.position;
      if (entity.companyId !== undefined) updateData.company_id = entity.companyId;
      if (entity.telegramUserId !== undefined) updateData.telegram_user_id = entity.telegramUserId;
      if (entity.isActive !== undefined) updateData.is_active = entity.isActive;

      const { data, error } = await supabaseAdmin
        .from('employee')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return Employee.fromPersistence(data);
    } catch (error) {
      if (error instanceof EntityNotFoundError || error instanceof DuplicateEntityError) {
        throw error;
      }
      throw new DomainException(
        `Failed to update employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('employee')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    try {
      const { error } = await db
        .from('employee')
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
      }

      return ids.length;
    } catch (error) {
      throw new DomainException(
        `Failed to delete employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findByInternal(filters: FilterOptions, options?: QueryOptions): Promise<Employee[]> {
    try {
      let query = supabaseAdmin.from('employee').select('*');

      // Применяем фильтры
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.position) {
        query = query.eq('position', filters.position);
      }

      if (filters.fullName) {
        query = query.ilike('full_name', `%${filters.fullName}%`);
      }

      // Применяем опции
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

      return data ? data.map(item => Employee.fromPersistence(item)) : [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employees by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async findOneInternal(filters: FilterOptions, options?: QueryOptions): Promise<Employee | null> {
    try {
      const employees = await this.findByInternal(filters, { ...options, limit: 1 });
      return employees.length > 0 ? employees[0] : null;
    } catch (error) {
      throw new DomainException(
        `Failed to find one employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async searchInternal(options: SearchOptions): Promise<Employee[]> {
    try {
      const { query, fields } = options;
      
      if (!query || fields.length === 0) {
        return [];
      }

      let searchQuery = supabaseAdmin.from('employee').select('*');

      // Создаем OR условия для поиска по полям
      const searchConditions = fields.map(field => {
        switch (field) {
        case 'fullName':
          return `full_name.ilike.%${query}%`;
        case 'position':
          return `position.ilike.%${query}%`;
        case 'telegramUserId':
          return `telegram_user_id.eq.${query}`;
        default:
          return null;
        }
      }).filter(Boolean);

      if (searchConditions.length > 0) {
        searchQuery = searchQuery.or(searchConditions.join(','));
      }

      if (options.options?.limit) {
        searchQuery = searchQuery.limit(options.options.limit);
      }

      if (options.options?.orderBy) {
        const direction = options.options.orderDirection || 'ASC';
        searchQuery = searchQuery.order(options.options.orderBy, { ascending: direction === 'ASC' });
      }

      const { data, error } = await searchQuery;

      if (error) {
        throw error;
      }

      return data ? data.map(item => Employee.fromPersistence(item)) : [];
    } catch (error) {
      throw new DomainException(
        `Failed to search employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async countInternal(filters?: FilterOptions): Promise<number> {
    try {
      let query = supabaseAdmin.from('employee').select('id', { count: 'exact' });

      if (filters) {
        if (filters.companyId) {
          query = query.eq('company_id', filters.companyId);
        }

        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }

        if (filters.position) {
          query = query.eq('position', filters.position);
        }
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      throw new DomainException(
        `Failed to count employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async existsInternal(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee')
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      throw new DomainException(
        `Failed to check employee existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  protected async beginTransactionInternal(): Promise<Transaction> {
    // Заглушка для транзакций
    return {
      async commit(): Promise<void> {
        // Заглушка
      },
      async rollback(): Promise<void> {
        // Заглушка
      },
      isActive(): boolean {
        return true;
      }
    };
  }

  // Специфичные методы для Employee
  async findByTelegramId(telegramUserId: string): Promise<Employee | null> {
    try {
      if (this.config.enableCaching) {
        const cached = await this.getFromCache(`telegram:${telegramUserId}`);
        if (cached !== null) {
          return cached;
        }
      }

      const employee = await this.findByTelegramIdInternal(telegramUserId);
      
      if (employee && this.config.enableCaching) {
        await this.setCache(`telegram:${telegramUserId}`, employee);
      }

      return employee;
    } catch (error) {
      this.logError('findByTelegramId', error, { telegramUserId });
      throw this.wrapError(error, 'findByTelegramId');
    }
  }

  private async findByTelegramIdInternal(telegramUserId: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee')
        .select('*')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data ? Employee.fromPersistence(data) : null;
    } catch (error) {
      throw new DomainException(
        `Failed to find employee by telegram user id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  async findByCompanyId(companyId: string, options?: QueryOptions): Promise<Employee[]> {
    return this.findBy({ companyId }, options);
  }

  async findActiveEmployees(companyId?: string, options?: QueryOptions): Promise<Employee[]> {
    const filters: FilterOptions = { isActive: true };
    if (companyId) {
      filters.companyId = companyId;
    }
    return this.findBy(filters, options);
  }

  async searchEmployees(query: string, companyId?: string, options?: QueryOptions): Promise<Employee[]> {
    const searchOptions: SearchOptions = {
      query,
      fields: ['fullName', 'position'],
      options
    };

    const employees = await this.search(searchOptions);
    
    if (companyId) {
      return employees.filter(emp => emp.companyId === companyId);
    }
    
    return employees;
  }
}
