// Repository для графиков сотрудников
import { supabaseAdmin } from '../../lib/supabase';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export interface EmployeeSchedule {
  employee_id: string;
  schedule_id: string;
  valid_from: string;
  valid_to?: string;
}

export class EmployeeScheduleRepository {
  // Получить все графики сотрудника
  async findByEmployeeId(employeeId: string): Promise<EmployeeSchedule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('employee_schedule')
        .select('*, schedule:schedule_template(id, name, rules)')
        .eq('employee_id', employeeId)
        .order('valid_from', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employee schedules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Получить текущий активный график сотрудника
  async findCurrentByEmployeeId(employeeId: string): Promise<EmployeeSchedule | null> {
    try {
      const now = new Date().toISOString().split('T')[0];
      const { data, error } = await supabaseAdmin
        .from('employee_schedule')
        .select('*, schedule:schedule_template(id, name, rules)')
        .eq('employee_id', employeeId)
        .lte('valid_from', now)
        .or(`valid_to.is.null,valid_to.gte.${now}`)
        .order('valid_from', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data || null;
    } catch (error) {
      throw new DomainException(
        `Failed to find current employee schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Получить все графики для компании через сотрудников
  async findByCompanyId(companyId: string): Promise<EmployeeSchedule[]> {
    try {
      // Получаем сотрудников компании
      const { data: employees, error: empError } = await supabaseAdmin
        .from('employee')
        .select('id')
        .eq('company_id', companyId);
      
      if (empError) throw empError;
      if (!employees || employees.length === 0) return [];
      
      const employeeIds = employees.map(e => e.id);

      // Получаем графики этих сотрудников
      const { data, error } = await supabaseAdmin
        .from('employee_schedule')
        .select('*, employee:employee(full_name, position), schedule:schedule_template(id, name, rules)')
        .in('employee_id', employeeIds)
        .order('valid_from', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new DomainException(
        `Failed to find employee schedules by company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Создать новую запись графика
  async create(data: EmployeeSchedule): Promise<EmployeeSchedule> {
    try {
      const { data: result, error } = await supabaseAdmin
        .from('employee_schedule')
        .insert({
          employee_id: data.employee_id,
          schedule_id: data.schedule_id,
          valid_from: data.valid_from,
          valid_to: data.valid_to
        })
        .select('*, schedule:schedule_template(id, name, rules)')
        .single();

      if (error) throw error;
      if (!result) throw new Error('Failed to create employee schedule: No data returned');
      return result;
    } catch (error) {
      throw new DomainException(
        `Failed to create employee schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Обновить график (по составному ключу employee_id + valid_from)
  async update(employeeId: string, validFrom: string, data: Partial<EmployeeSchedule>): Promise<EmployeeSchedule> {
    try {
      const updateData: any = {};
      if (data.schedule_id !== undefined) updateData.schedule_id = data.schedule_id;
      if (data.valid_to !== undefined) updateData.valid_to = data.valid_to;

      const { data: result, error } = await supabaseAdmin
        .from('employee_schedule')
        .update(updateData)
        .eq('employee_id', employeeId)
        .eq('valid_from', validFrom)
        .select('*, schedule:schedule_template(id, name, rules)')
        .single();

      if (error) throw error;
      if (!result) throw new Error('Employee schedule not found');
      return result;
    } catch (error) {
      throw new DomainException(
        `Failed to update employee schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }

  // Удалить график
  async delete(employeeId: string, validFrom: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('employee_schedule')
        .delete()
        .eq('employee_id', employeeId)
        .eq('valid_from', validFrom);

      if (error) throw error;
      return true;
    } catch (error) {
      throw new DomainException(
        `Failed to delete employee schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_ERROR'
      );
    }
  }
}




