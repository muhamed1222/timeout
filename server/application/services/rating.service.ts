// Сервис для рейтинга и нарушений
import {
  ViolationRuleRepository,
  ViolationRepository,
  EmployeeRatingRepository,
  type ViolationRule,
  type Violation,
  type EmployeeRating
} from '../../infrastructure/repositories';

export class RatingService {
  private violationRuleRepo: ViolationRuleRepository;
  private violationRepo: ViolationRepository;
  private ratingRepo: EmployeeRatingRepository;

  constructor() {
    this.violationRuleRepo = new ViolationRuleRepository();
    this.violationRepo = new ViolationRepository();
    this.ratingRepo = new EmployeeRatingRepository();
  }

  // ========== Violation Rules ==========

  async getViolationRules(companyId: string): Promise<ViolationRule[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.violationRuleRepo.findByCompanyId(companyId);
  }

  async getActiveViolationRules(companyId: string): Promise<ViolationRule[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.violationRuleRepo.findActiveByCompanyId(companyId);
  }

  async getViolationRuleById(ruleId: string): Promise<ViolationRule | null> {
    if (!ruleId) {
      throw new Error('ID правила обязателен');
    }
    return this.violationRuleRepo.findById(ruleId);
  }

  async createViolationRule(data: {
    company_id: string;
    code: string;
    name: string;
    penalty_percent: number;
    auto_detectable?: boolean;
    is_active?: boolean;
  }): Promise<ViolationRule> {
    if (!data.company_id) {
      throw new Error('ID компании обязателен');
    }
    if (!data.code) {
      throw new Error('Код правила обязателен');
    }
    if (!data.name) {
      throw new Error('Название правила обязательно');
    }
    if (data.penalty_percent === undefined || data.penalty_percent < 0) {
      throw new Error('Процент штрафа должен быть больше или равен 0');
    }

    return this.violationRuleRepo.create(data);
  }

  async updateViolationRule(
    ruleId: string,
    data: {
      name?: string;
      penalty_percent?: number;
      auto_detectable?: boolean;
      is_active?: boolean;
    }
  ): Promise<ViolationRule> {
    if (!ruleId) {
      throw new Error('ID правила обязателен');
    }

    const existing = await this.violationRuleRepo.findById(ruleId);
    if (!existing) {
      throw new Error('Правило не найдено');
    }

    return this.violationRuleRepo.update(ruleId, data);
  }

  async deleteViolationRule(ruleId: string): Promise<boolean> {
    if (!ruleId) {
      throw new Error('ID правила обязателен');
    }

    const existing = await this.violationRuleRepo.findById(ruleId);
    if (!existing) {
      throw new Error('Правило не найдено');
    }

    return this.violationRuleRepo.delete(ruleId);
  }

  // ========== Violations ==========

  async getViolations(companyId: string, options?: { limit?: number; offset?: number }): Promise<Violation[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.violationRepo.findByCompanyId(companyId, options);
  }

  async getEmployeeViolations(employeeId: string, options?: { limit?: number; offset?: number }): Promise<Violation[]> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    return this.violationRepo.findByEmployeeId(employeeId, options);
  }

  async getViolationById(violationId: string): Promise<Violation | null> {
    if (!violationId) {
      throw new Error('ID нарушения обязателен');
    }
    return this.violationRepo.findById(violationId);
  }

  async createViolation(data: {
    employee_id: string;
    company_id: string;
    rule_id: string;
    source: string;
    reason?: string;
    penalty: number;
    created_by?: string;
  }): Promise<Violation> {
    if (!data.employee_id) {
      throw new Error('ID сотрудника обязателен');
    }
    if (!data.company_id) {
      throw new Error('ID компании обязателен');
    }
    if (!data.rule_id) {
      throw new Error('ID правила обязателен');
    }
    if (!data.source) {
      throw new Error('Источник нарушения обязателен');
    }
    if (data.penalty === undefined || data.penalty < 0) {
      throw new Error('Штраф должен быть больше или равен 0');
    }

    // Проверяем существование правила
    const rule = await this.violationRuleRepo.findById(data.rule_id);
    if (!rule) {
      throw new Error('Правило нарушения не найдено');
    }

    const violation = await this.violationRepo.create(data);

    // Обновляем рейтинг сотрудника
    await this.updateEmployeeRatingAfterViolation(data.employee_id, data.penalty);

    return violation;
  }

  async updateViolation(
    violationId: string,
    data: {
      reason?: string;
      penalty?: number;
    }
  ): Promise<Violation> {
    if (!violationId) {
      throw new Error('ID нарушения обязателен');
    }

    const existing = await this.violationRepo.findById(violationId);
    if (!existing) {
      throw new Error('Нарушение не найдено');
    }

    // Если обновляется штраф, пересчитываем рейтинг
    if (data.penalty !== undefined && data.penalty !== existing.penalty) {
      const penaltyDiff = data.penalty - existing.penalty;
      await this.updateEmployeeRatingAfterViolation(existing.employee_id, penaltyDiff);
    }

    return this.violationRepo.update(violationId, data);
  }

  async deleteViolation(violationId: string): Promise<boolean> {
    if (!violationId) {
      throw new Error('ID нарушения обязателен');
    }

    const existing = await this.violationRepo.findById(violationId);
    if (!existing) {
      throw new Error('Нарушение не найдено');
    }

    // Восстанавливаем рейтинг сотрудника
    await this.updateEmployeeRatingAfterViolation(existing.employee_id, -existing.penalty);

    return this.violationRepo.delete(violationId);
  }

  // ========== Employee Rating ==========

  async getEmployeeRatings(companyId: string, options?: { limit?: number; offset?: number }): Promise<EmployeeRating[]> {
    if (!companyId) {
      throw new Error('ID компании обязателен');
    }
    return this.ratingRepo.findByCompanyId(companyId, options);
  }

  async getEmployeeRatingHistory(employeeId: string): Promise<EmployeeRating[]> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    return this.ratingRepo.findByEmployeeId(employeeId);
  }

  async getCurrentEmployeeRating(employeeId: string): Promise<EmployeeRating | null> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }
    return this.ratingRepo.findCurrentByEmployeeId(employeeId);
  }

  async createEmployeeRating(data: {
    employee_id: string;
    company_id: string;
    period_start: string;
    period_end: string;
    rating?: number;
    status?: string;
  }): Promise<EmployeeRating> {
    if (!data.employee_id) {
      throw new Error('ID сотрудника обязателен');
    }
    if (!data.company_id) {
      throw new Error('ID компании обязателен');
    }
    if (!data.period_start) {
      throw new Error('Дата начала периода обязательна');
    }
    if (!data.period_end) {
      throw new Error('Дата окончания периода обязательна');
    }

    return this.ratingRepo.create(data);
  }

  async updateEmployeeRating(
    ratingId: string,
    data: {
      rating?: number;
      status?: string;
      period_end?: string;
    }
  ): Promise<EmployeeRating> {
    if (!ratingId) {
      throw new Error('ID рейтинга обязателен');
    }

    const existing = await this.ratingRepo.findById(ratingId);
    if (!existing) {
      throw new Error('Рейтинг не найден');
    }

    return this.ratingRepo.update(ratingId, data);
  }

  // ========== Helper Methods ==========

  private async updateEmployeeRatingAfterViolation(employeeId: string, penaltyChange: number): Promise<void> {
    try {
      const currentRating = await this.ratingRepo.findCurrentByEmployeeId(employeeId);
      if (currentRating) {
        const newRating = Math.max(0, Math.min(100, currentRating.rating - penaltyChange));
        await this.ratingRepo.update(currentRating.id, { rating: newRating });
      }
    } catch (error) {
      console.error('Failed to update employee rating after violation:', error);
      // Не пробрасываем ошибку, чтобы не блокировать создание нарушения
    }
  }

  async calculateEmployeeRating(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
    if (!employeeId) {
      throw new Error('ID сотрудника обязателен');
    }

    // Получаем все нарушения за период
    const allViolations = await this.violationRepo.findByEmployeeId(employeeId);
    const periodViolations = allViolations.filter(v => {
      const violationDate = new Date(v.created_at);
      return violationDate >= new Date(periodStart) && violationDate <= new Date(periodEnd);
    });

    // Суммируем штрафы
    const totalPenalty = periodViolations.reduce((sum, v) => sum + v.penalty, 0);

    // Рейтинг = 100 - сумма штрафов (но не меньше 0)
    return Math.max(0, 100 - totalPenalty);
  }
}




