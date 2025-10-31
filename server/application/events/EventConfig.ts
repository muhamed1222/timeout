// Конфигурация событийной системы
import { eventBus } from './EventBus';
import { EmployeeEventHandler } from './handlers/EmployeeEventHandler';
import { ShiftEventHandler } from './handlers/ShiftEventHandler';

export class EventConfig {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Создаем экземпляры обработчиков
    const employeeEventHandler = new EmployeeEventHandler();
    const shiftEventHandler = new ShiftEventHandler();

    // Регистрируем обработчики событий сотрудников
    eventBus.registerHandler('EmployeeCreated', employeeEventHandler);
    eventBus.registerHandler('EmployeeUpdated', employeeEventHandler);
    eventBus.registerHandler('EmployeeDeleted', employeeEventHandler);
    eventBus.registerHandler('EmployeeActivated', employeeEventHandler);
    eventBus.registerHandler('EmployeeDeactivated', employeeEventHandler);

    // Регистрируем обработчики событий смен
    eventBus.registerHandler('ShiftStarted', shiftEventHandler);
    eventBus.registerHandler('ShiftEnded', shiftEventHandler);
    eventBus.registerHandler('ShiftCancelled', shiftEventHandler);
    eventBus.registerHandler('ShiftViolationDetected', shiftEventHandler);

    this.initialized = true;
    console.log('Event system initialized with handlers:', eventBus.getRegisteredHandlers());
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getRegisteredHandlers(): Record<string, number> {
    return eventBus.getRegisteredHandlers();
  }
}

// Константы для типов событий
export const EVENT_TYPES = {
  // События сотрудников
  EMPLOYEE_CREATED: 'EmployeeCreated',
  EMPLOYEE_UPDATED: 'EmployeeUpdated',
  EMPLOYEE_DELETED: 'EmployeeDeleted',
  EMPLOYEE_ACTIVATED: 'EmployeeActivated',
  EMPLOYEE_DEACTIVATED: 'EmployeeDeactivated',
  
  // События смен
  SHIFT_STARTED: 'ShiftStarted',
  SHIFT_ENDED: 'ShiftEnded',
  SHIFT_CANCELLED: 'ShiftCancelled',
  SHIFT_VIOLATION_DETECTED: 'ShiftViolationDetected',
} as const;



