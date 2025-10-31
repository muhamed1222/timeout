// CompanyRepository с реализацией на Supabase
import { BaseRepository } from './BaseRepository';
import { supabaseAdmin } from '../../lib/supabase';

export interface Company {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  privacy_settings: any;
  created_at: Date | null;
}

export class CompanyRepository extends BaseRepository<Company, string> {
  constructor() {
    super('company');
  }

  protected extractId(entity: Company): string {
    return entity.id;
  }

  protected validateEntity(entity: Partial<Company>): void {
    if (!entity) {
      throw new Error('Company entity is required');
    }
  }

  // Реализация методов с использованием Supabase
  protected async findByIdInternal(id: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  }

  protected async findByIdsInternal(ids: string[]): Promise<Company[]> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*')
      .in('id', ids);

    if (error) throw error;
    return data || [];
  }

  protected async findAllInternal(): Promise<Company[]> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  protected async createInternal(entity: Partial<Company>): Promise<Company> {
    const { data, error} = await supabaseAdmin
      .from('company')
      .insert(entity)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  protected async updateInternal(id: string, entity: Partial<Company>): Promise<Company> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .update(entity)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  protected async deleteInternal(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('company')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  protected async deleteManyInternal(ids: string[]): Promise<number> {
    const { error, count } = await supabaseAdmin
      .from('company')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return count || 0;
  }

  protected async findByInternal(): Promise<Company[]> {
    return this.findAllInternal();
  }

  protected async findOneInternal(): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  protected async searchInternal(): Promise<Company[]> {
    return this.findAllInternal();
  }

  protected async countInternal(): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('company')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }

  protected async existsInternal(id: string): Promise<boolean> {
    const company = await this.findByIdInternal(id);
    return !!company;
  }

  protected async beginTransactionInternal(): Promise<any> {
    // Supabase не поддерживает транзакции через клиент
    // Возвращаем пустой объект
    return {};
  }

  // Дополнительные методы для компании
  async findByName(name: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  async updateSettings(id: string, settings: any): Promise<Company> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .update({ privacy_settings: settings })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCompanyStats(id: string): Promise<{
    totalEmployees: number;
    activeShifts: number;
    completedShifts: number;
    exceptions: number;
  }> {
    // Получаем статистику из базы данных
    const [employeesCount, activeShiftsCount, completedShiftsCount, exceptionsCount] = await Promise.all([
      // Общее количество сотрудников
      supabaseAdmin
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id)
        .then(({ count, error }) => {
          if (error) throw error;
          return count || 0;
        }),
      
      // Активные смены
      supabaseAdmin
        .from('shift')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', id)
        .eq('status', 'active')
        .then(({ count, error }) => {
          if (error) throw error;
          return count || 0;
        }),
      
      // Завершенные смены
      supabaseAdmin
        .from('shift')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', id)
        .eq('status', 'completed')
        .then(({ count, error }) => {
          if (error) throw error;
          return count || 0;
        }),
      
      // Исключения
      supabaseAdmin
        .from('exception')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', id)
        .then(({ count, error }) => {
          if (error) throw error;
          return count || 0;
        }),
    ]);

    return {
      totalEmployees: employeesCount,
      activeShifts: activeShiftsCount,
      completedShifts: completedShiftsCount,
      exceptions: exceptionsCount,
    };
  }

  async getActiveShifts(companyId: string): Promise<any[]> {
    // Сначала получаем ID всех сотрудников компании
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employee')
      .select('id')
      .eq('company_id', companyId);

    if (employeesError) throw employeesError;
    
    if (!employees || employees.length === 0) {
      return []; // Нет сотрудников - нет смен
    }

    const employeeIds = employees.map(emp => emp.id);

    // Теперь получаем активные смены этих сотрудников
    const { data, error } = await supabaseAdmin
      .from('shift')
      .select(`
        *,
        employee:employee (
          id,
          full_name,
          position
        )
      `)
      .in('employee_id', employeeIds)
      .eq('status', 'active')
      .order('planned_start_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByOwnerId(ownerId: string): Promise<Company[]> {
    const { data, error } = await supabaseAdmin
      .from('company')
      .select('*')
      .eq('owner_id', ownerId);

    if (error) throw error;
    return data || [];
  }
}
