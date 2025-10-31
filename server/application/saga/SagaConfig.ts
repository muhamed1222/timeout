// Конфигурация системы Saga
import { SagaManager } from './SagaManager';
import { employeeRegistrationSaga } from './sagas/EmployeeRegistrationSaga';
import { shiftManagementSaga, endShiftSaga } from './sagas/ShiftManagementSaga';

export class SagaConfig {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    const sagaManager = SagaManager.getInstance();

    // Регистрируем определения Saga
    sagaManager.registerDefinition(employeeRegistrationSaga);
    sagaManager.registerDefinition(shiftManagementSaga);
    sagaManager.registerDefinition(endShiftSaga);

    this.initialized = true;
    console.log('Saga system initialized with definitions:', [
      employeeRegistrationSaga.id,
      shiftManagementSaga.id,
      endShiftSaga.id
    ]);
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  // Запуск Saga регистрации сотрудника
  static async startEmployeeRegistration(
    correlationId: string, 
    employeeData: Record<string, unknown>
  ): Promise<string> {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.startSaga('employee_registration', correlationId, employeeData);
  }

  // Запуск Saga управления сменами
  static async startShiftManagement(
    correlationId: string, 
    shiftData: Record<string, unknown>
  ): Promise<string> {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.startSaga('shift_management', correlationId, shiftData);
  }

  // Запуск Saga завершения смены
  static async startEndShift(
    correlationId: string, 
    endShiftData: Record<string, unknown>
  ): Promise<string> {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.startSaga('end_shift', correlationId, endShiftData);
  }

  // Получение статуса Saga
  static async getSagaStatus(sagaId: string) {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.getSagaStatus(sagaId);
  }

  // Получение всех Saga по correlationId
  static async getAllSagas(correlationId?: string) {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.getAllSagas(correlationId);
  }

  // Компенсация Saga
  static async compensateSaga(sagaId: string) {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.compensateSaga(sagaId);
  }

  // Очистка завершенных Saga
  static async cleanupCompletedSagas(maxAge?: number) {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.cleanupCompletedSagas(maxAge);
  }

  // Получение статистики Saga
  static getStats() {
    const sagaManager = SagaManager.getInstance();
    return sagaManager.getStats();
  }

  // Получение информации о системе
  static getInfo() {
    const sagaManager = SagaManager.getInstance();
    const stats = sagaManager.getStats();
    
    return {
      initialized: this.initialized,
      ...stats
    };
  }
}



