// Обработчики событий сотрудников
import { IEventHandler } from '../EventBus';
import { EmployeeCreatedEvent, EmployeeUpdatedEvent, EmployeeDeletedEvent } from '../../../../shared/domain/events/EmployeeEvents';

export class EmployeeEventHandler implements IEventHandler {
  // Обработка создания сотрудника
  async handleEmployeeCreated(event: EmployeeCreatedEvent): Promise<void> {
    console.log(`Employee created: ${event.fullName} (${event.employeeId.toString()})`);
    
    // Здесь можно добавить логику:
    // - Отправка уведомления администратору
    // - Создание записи в логе аудита
    // - Инициализация настроек сотрудника
    // - Отправка приветственного сообщения в Telegram
    
    // Пример: логирование в систему аудита
    await this.logToAuditSystem({
      action: 'EMPLOYEE_CREATED',
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        fullName: event.fullName,
        position: event.position,
        telegramUserId: event.telegramUserId
      }
    });
  }

  // Обработка обновления сотрудника
  async handleEmployeeUpdated(event: EmployeeUpdatedEvent): Promise<void> {
    console.log(`Employee updated: ${event.employeeId.toString()}`);
    
    // Логирование изменений
    await this.logToAuditSystem({
      action: 'EMPLOYEE_UPDATED',
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: event.changes
    });
  }

  // Обработка удаления сотрудника
  async handleEmployeeDeleted(event: EmployeeDeletedEvent): Promise<void> {
    console.log(`Employee deleted: ${event.fullName} (${event.employeeId.toString()})`);
    
    // Логирование удаления
    await this.logToAuditSystem({
      action: 'EMPLOYEE_DELETED',
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        fullName: event.fullName
      }
    });
  }

  // Универсальный обработчик
  async handle(event: any): Promise<void> {
    switch (event.getEventType()) {
    case 'EmployeeCreated':
      await this.handleEmployeeCreated(event);
      break;
    case 'EmployeeUpdated':
      await this.handleEmployeeUpdated(event);
      break;
    case 'EmployeeDeleted':
      await this.handleEmployeeDeleted(event);
      break;
    default:
      console.warn(`Unknown employee event type: ${event.getEventType()}`);
    }
  }

  // Логирование в систему аудита
  private async logToAuditSystem(data: {
    action: string;
    employeeId: string;
    companyId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    // Здесь можно интегрироваться с системой аудита
    // Например, отправка в Elasticsearch, базу данных или внешний сервис
    console.log('Audit log:', data);
  }
}



