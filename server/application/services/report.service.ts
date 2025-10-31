// Сервис для отчетов
import {
  DailyReportRepository,
  type DailyReport
} from '../../infrastructure/repositories';

export class ReportService {
  private reportRepo: DailyReportRepository;

  constructor() {
    this.reportRepo = new DailyReportRepository();
  }

  // ========== Daily Reports ==========

  async getDailyReports(companyId: string, options?: { limit?: number; offset?: number }): Promise<DailyReport[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.reportRepo.findByCompanyId(companyId, options);
  }

  async getDailyReportById(reportId: string): Promise<DailyReport | null> {
    if (!reportId) {
      throw new Error('ID отчета обязателен');
    }
    return this.reportRepo.findById(reportId);
  }

  async getDailyReportByShiftId(shiftId: string): Promise<DailyReport | null> {
    if (!shiftId) {
      throw new Error('ID смены обязателен');
    }
    return this.reportRepo.findByShiftId(shiftId);
  }

  async createDailyReport(data: {
    shift_id: string;
    planned_items?: string[];
    done_items?: string[];
    blockers?: string;
    tasks_links?: string[];
    time_spent?: any;
    attachments?: any;
  }): Promise<DailyReport> {
    if (!data.shift_id) {
      throw new Error('ID смены обязателен');
    }

    // Проверяем, не существует ли уже отчет для этой смены
    const existing = await this.reportRepo.findByShiftId(data.shift_id);
    if (existing) {
      throw new Error('Отчет для этой смены уже существует');
    }

    return this.reportRepo.create(data);
  }

  async updateDailyReport(
    reportId: string,
    data: {
      planned_items?: string[];
      done_items?: string[];
      blockers?: string;
      tasks_links?: string[];
      time_spent?: any;
      attachments?: any;
    }
  ): Promise<DailyReport> {
    if (!reportId) {
      throw new Error('ID отчета обязателен');
    }

    const existing = await this.reportRepo.findById(reportId);
    if (!existing) {
      throw new Error('Отчет не найден');
    }

    return this.reportRepo.update(reportId, data);
  }

  async deleteDailyReport(reportId: string): Promise<boolean> {
    if (!reportId) {
      throw new Error('ID отчета обязателен');
    }

    const existing = await this.reportRepo.findById(reportId);
    if (!existing) {
      throw new Error('Отчет не найден');
    }

    return this.reportRepo.delete(reportId);
  }
}




