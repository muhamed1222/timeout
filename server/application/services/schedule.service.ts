// Сервис для графиков работы
import {
  ScheduleTemplateRepository,
  EmployeeScheduleRepository,
  type ScheduleTemplate,
  type EmployeeSchedule
} from '../../infrastructure/repositories';

export class ScheduleService {
  private templateRepo: ScheduleTemplateRepository;
  private employeeScheduleRepo: EmployeeScheduleRepository;

  constructor() {
    this.templateRepo = new ScheduleTemplateRepository();
    this.employeeScheduleRepo = new EmployeeScheduleRepository();
  }

  // ========== Schedule Templates ==========

  async getScheduleTemplates(companyId: string): Promise<ScheduleTemplate[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.templateRepo.findByCompanyId(companyId);
  }

  async getScheduleTemplateById(templateId: string): Promise<ScheduleTemplate | null> {
    if (!templateId) {
      throw new Error('ID шаблона обязателен');
    }
    return this.templateRepo.findById(templateId);
  }

  async createScheduleTemplate(data: {
    company_id: string;
    name: string;
    rules: any;
  }): Promise<ScheduleTemplate> {
    if (!data.company_id) {
      throw new Error('ID компании обязателен');
    }
    if (!data.name) {
      throw new Error('Название шаблона обязательно');
    }
    if (!data.rules) {
      throw new Error('Правила графика обязательны');
    }

    return this.templateRepo.create(data);
  }

  async updateScheduleTemplate(
    templateId: string,
    data: {
      name?: string;
      rules?: any;
    }
  ): Promise<ScheduleTemplate> {
    if (!templateId) {
      throw new Error('ID шаблона обязателен');
    }

    const existing = await this.templateRepo.findById(templateId);
    if (!existing) {
      throw new Error('Шаблон графика не найден');
    }

    return this.templateRepo.update(templateId, data);
  }

  async deleteScheduleTemplate(templateId: string): Promise<boolean> {
    if (!templateId) {
      throw new Error('ID шаблона обязателен');
    }

    const existing = await this.templateRepo.findById(templateId);
    if (!existing) {
      throw new Error('Шаблон графика не найден');
    }

    return this.templateRepo.delete(templateId);
  }

  // ========== Employee Schedules ==========

  async getEmployeeSchedules(companyId: string): Promise<EmployeeSchedule[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.employeeScheduleRepo.findByCompanyId(companyId);
  }

  async getEmployeeSchedulesByEmployeeId(employeeId: string): Promise<EmployeeSchedule[]> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    return this.employeeScheduleRepo.findByEmployeeId(employeeId);
  }

  async getCurrentEmployeeSchedule(employeeId: string): Promise<EmployeeSchedule | null> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    return this.employeeScheduleRepo.findCurrentByEmployeeId(employeeId);
  }

  async assignScheduleToEmployee(data: {
    employee_id: string;
    schedule_id: string;
    valid_from: string;
    valid_to?: string;
  }): Promise<EmployeeSchedule> {
    if (!data.employee_id) {
      throw new Error('ID сотрудника обязателен');
    }
    if (!data.schedule_id) {
      throw new Error('ID графика обязателен');
    }
    if (!data.valid_from) {
      throw new Error('Дата начала действия графика обязательна');
    }

    // Проверяем существование шаблона
    const template = await this.templateRepo.findById(data.schedule_id);
    if (!template) {
      throw new Error('Шаблон графика не найден');
    }

    return this.employeeScheduleRepo.create(data);
  }

  async updateEmployeeSchedule(
    employeeId: string,
    validFrom: string,
    data: {
      schedule_id?: string;
      valid_to?: string;
    }
  ): Promise<EmployeeSchedule> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    if (!validFrom) {
      throw new Error('Дата начала действия графика обязательна');
    }

    if (data.schedule_id) {
      const template = await this.templateRepo.findById(data.schedule_id);
      if (!template) {
        throw new Error('Шаблон графика не найден');
      }
    }

    return this.employeeScheduleRepo.update(employeeId, validFrom, data);
  }

  async removeEmployeeSchedule(employeeId: string, validFrom: string): Promise<boolean> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    if (!validFrom) {
      throw new Error('Дата начала действия графика обязательна');
    }

    return this.employeeScheduleRepo.delete(employeeId, validFrom);
  }
}




