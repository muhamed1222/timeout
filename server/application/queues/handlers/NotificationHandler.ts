// Обработчик задач уведомлений
import { IQueueJobHandler, QueueJob, QueueJobResult } from '../QueueJob';
import { EmployeeApplicationService } from '../../services/EmployeeApplicationService';
import { DomainException } from '../../../../shared/domain/exceptions/DomainException';

export class NotificationHandler implements IQueueJobHandler {
  constructor(private employeeService: EmployeeApplicationService) {}

  async handle(job: QueueJob): Promise<QueueJobResult> {
    try {
      switch (job.type) {
      case 'SEND_SHIFT_REMINDER':
        return await this.sendShiftReminder(job.payload);
        
      case 'SEND_VIOLATION_NOTIFICATION':
        return await this.sendViolationNotification(job.payload);
        
      case 'SEND_WEEKLY_REPORT':
        return await this.sendWeeklyReport(job.payload);
        
      case 'SEND_EMPLOYEE_WELCOME':
        return await this.sendEmployeeWelcome(job.payload);
        
      default:
        throw new DomainException(`Unknown notification type: ${job.type}`, 'UNKNOWN_NOTIFICATION_TYPE');
      }
    } catch (error) {
      console.error('Error in NotificationHandler:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retry: true
      };
    }
  }

  // Отправка напоминания о смене
  private async sendShiftReminder(payload: any): Promise<QueueJobResult> {
    try {
      const { employeeId, shiftId, reminderType } = payload;
      
      if (!employeeId || !shiftId) {
        throw new DomainException('Employee ID and Shift ID are required', 'INVALID_PAYLOAD');
      }

      const employee = await this.employeeService.getEmployeeById(employeeId);
      
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        };
      }

      // Здесь можно интегрироваться с Telegram Bot API
      const message = this.buildShiftReminderMessage(employee.fullName, reminderType);
      
      // Симуляция отправки уведомления
      console.log(`Sending shift reminder to ${employee.fullName}: ${message}`);
      
      // В реальном приложении здесь был бы вызов Telegram API
      // await this.telegramService.sendMessage(employee.telegramUserId, message);

      return {
        success: true,
        data: { 
          employeeId,
          message,
          sent: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Отправка уведомления о нарушении
  private async sendViolationNotification(payload: any): Promise<QueueJobResult> {
    try {
      const { employeeId, violationType, severity, details } = payload;
      
      if (!employeeId || !violationType) {
        throw new DomainException('Employee ID and violation type are required', 'INVALID_PAYLOAD');
      }

      const employee = await this.employeeService.getEmployeeById(employeeId);
      
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        };
      }

      const message = this.buildViolationMessage(employee.fullName, violationType, severity, details);
      
      console.log(`Sending violation notification to ${employee.fullName}: ${message}`);
      
      // Уведомление администратору
      await this.notifyAdministrator(employee.companyId.toString(), {
        employeeName: employee.fullName,
        violationType,
        severity,
        details
      });

      return {
        success: true,
        data: { 
          employeeId,
          message,
          sent: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Отправка еженедельного отчета
  private async sendWeeklyReport(payload: any): Promise<QueueJobResult> {
    try {
      const { companyId, weekStart, weekEnd } = payload;
      
      if (!companyId) {
        throw new DomainException('Company ID is required', 'INVALID_PAYLOAD');
      }

      // Получаем статистику за неделю
      const employees = await this.employeeService.findByCompanyId(companyId);
      const report = this.buildWeeklyReport(employees, weekStart, weekEnd);
      
      console.log(`Sending weekly report for company ${companyId}:`, report);
      
      // Здесь можно отправить отчет администратору компании
      // await this.emailService.sendReport(companyId, report);

      return {
        success: true,
        data: { 
          companyId,
          report,
          sent: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Отправка приветственного сообщения новому сотруднику
  private async sendEmployeeWelcome(payload: any): Promise<QueueJobResult> {
    try {
      const { employeeId, inviteCode } = payload;
      
      if (!employeeId) {
        throw new DomainException('Employee ID is required', 'INVALID_PAYLOAD');
      }

      const employee = await this.employeeService.getEmployeeById(employeeId);
      
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        };
      }

      const message = this.buildWelcomeMessage(employee.fullName, inviteCode);
      
      console.log(`Sending welcome message to ${employee.fullName}: ${message}`);
      
      // В реальном приложении здесь был бы вызов Telegram API
      // if (employee.telegramUserId) {
      //   await this.telegramService.sendMessage(employee.telegramUserId, message);
      // }

      return {
        success: true,
        data: { 
          employeeId,
          message,
          sent: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Построение сообщения напоминания о смене
  private buildShiftReminderMessage(employeeName: string, reminderType: string): string {
    switch (reminderType) {
    case 'start':
      return `Привет, ${employeeName}! Напоминаем, что через 15 минут начинается ваша смена.`;
    case 'break':
      return `Привет, ${employeeName}! Не забудьте сделать перерыв.`;
    case 'end':
      return `Привет, ${employeeName}! Через 15 минут заканчивается ваша смена.`;
    default:
      return `Привет, ${employeeName}! Напоминание о смене.`;
    }
  }

  // Построение сообщения о нарушении
  private buildViolationMessage(employeeName: string, violationType: string, severity: number, details: any): string {
    const severityText = severity === 3 ? 'критическое' : severity === 2 ? 'серьезное' : 'незначительное';
    
    switch (violationType) {
    case 'late_start':
      return `⚠️ ${severityText.toUpperCase()} нарушение: ${employeeName} опоздал на ${details.delayMinutes} минут.`;
    case 'early_end':
      return `⚠️ ${severityText.toUpperCase()} нарушение: ${employeeName} завершил смену на ${details.earlyEndMinutes} минут раньше.`;
    case 'missed_shift':
      return `🚨 ${severityText.toUpperCase()} нарушение: ${employeeName} пропустил смену.`;
    case 'long_break':
      return `⚠️ ${severityText.toUpperCase()} нарушение: ${employeeName} работает без перерыва ${details.workingTime} минут.`;
    default:
      return `⚠️ ${severityText.toUpperCase()} нарушение: ${employeeName} - ${violationType}.`;
    }
  }

  // Построение еженедельного отчета
  private buildWeeklyReport(employees: any[], weekStart: string, weekEnd: string): any {
    return {
      period: { weekStart, weekEnd },
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.status === 'active').length,
      summary: {
        totalShifts: 0, // Здесь должна быть логика подсчета смен
        completedShifts: 0,
        violations: 0
      }
    };
  }

  // Построение приветственного сообщения
  private buildWelcomeMessage(employeeName: string, inviteCode?: string): string {
    let message = `Добро пожаловать в команду, ${employeeName}! 🎉\n\n`;
    message += 'Ваш аккаунт успешно создан. ';
    
    if (inviteCode) {
      message += `Используйте код ${inviteCode} для подключения к Telegram боту.`;
    }
    
    message += '\n\nЕсли у вас есть вопросы, обращайтесь к администратору.';
    
    return message;
  }

  // Уведомление администратора
  private async notifyAdministrator(companyId: string, violationData: any): Promise<void> {
    console.log(`Notifying administrator of company ${companyId} about violation:`, violationData);
    // Здесь можно отправить уведомление администратору компании
  }
}



