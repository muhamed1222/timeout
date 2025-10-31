// Сервис для бизнес-логики компаний

import { CompanyRepository } from '../../infrastructure/repositories';
import { Company } from '../../../shared/types/entities/company';
import {
  type CreateCompanyInput,
  type UpdateCompanyInput,
  type CompanySettingsInput,
} from '../validators';

export class CompanyService {
  private companyRepo: CompanyRepository;

  constructor() {
    this.companyRepo = new CompanyRepository();
  }

  // Создать компанию
  async createCompany(data: CreateCompanyInput): Promise<Company> {
    // Валидация
    if (!data.name?.trim()) {
      throw new Error('Название компании обязательно');
    }

    // Проверка уникальности названия
    const existingCompany = await this.companyRepo.findByName(data.name.trim());
    if (existingCompany) {
      throw new Error('Компания с таким названием уже существует');
    }

    return this.companyRepo.create({
      name: data.name.trim(),
      timezone: data.timezone || 'Europe/Amsterdam',
      locale: data.locale || 'ru',
      privacy_settings: data.privacy_settings || {},
    });
  }

  // Получить компанию по ID
  async getCompany(id: string): Promise<Company | undefined> {
    if (!id) {
      throw new Error('ID компании обязателен');
    }

    return this.companyRepo.findById(id);
  }

  // Получить все компании
  async getAllCompanies(): Promise<Company[]> {
    return this.companyRepo.findAll();
  }

  // Обновить компанию
  async updateCompany(
    id: string,
    data: UpdateCompanyInput
  ): Promise<Company | undefined> {
    if (!id) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(id);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    // Проверка уникальности названия при изменении
    if (data.name && data.name !== existingCompany.name) {
      const companyWithSameName = await this.companyRepo.findByName(
        data.name.trim()
      );
      if (companyWithSameName) {
        throw new Error('Компания с таким названием уже существует');
      }
    }

    return this.companyRepo.update(id, {
      ...data,
      name: data.name?.trim(),
    });
  }

  // Удалить компанию
  async deleteCompany(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(id);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    await this.companyRepo.delete(id);
  }

  // Обновить настройки компании
  async updateCompanySettings(
    id: string,
    settings: CompanySettingsInput
  ): Promise<Company | undefined> {
    if (!id) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(id);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    return this.companyRepo.updateSettings(id, settings);
  }

  // Получить статистику компании
  async getCompanyStats(id: string): Promise<{
    totalEmployees: number;
    activeShifts: number;
    completedShifts: number;
    exceptions: number;
  }> {
    if (!id) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(id);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    return this.companyRepo.getCompanyStats(id);
  }

  // Получить активные смены компании
  async getActiveShifts(companyId: string): Promise<any[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(companyId);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    return this.companyRepo.getActiveShifts(companyId);
  }

  // Получить компании по владельцу
  async getCompaniesByOwner(ownerId: string): Promise<Company[]> {
    if (!ownerId) {
      throw new Error('ID владельца обязателен');
    }

    return this.companyRepo.findByOwnerId(ownerId);
  }

  // Получить исключения компании
  async getExceptions(companyId: string, page: number = 1, limit: number = 20): Promise<any[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }

    // Проверка существования компании
    const existingCompany = await this.companyRepo.findById(companyId);
    if (!existingCompany) {
      throw new Error('Компания не найдена');
    }

    // Временно возвращаем пустой массив для отладки
    return [];
  }
}
