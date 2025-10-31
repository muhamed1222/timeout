// Конфигурация CQRS
import { mediator } from '../mediator/Mediator';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';
import { ShiftApplicationService } from '../services/ShiftApplicationService';

// Commands
import { CreateEmployeeCommand } from '../commands/CreateEmployeeCommand';
import { UpdateEmployeeCommand } from '../commands/UpdateEmployeeCommand';
import { DeleteEmployeeCommand } from '../commands/DeleteEmployeeCommand';
import { StartShiftCommand } from '../commands/StartShiftCommand';
import { EndShiftCommand } from '../commands/EndShiftCommand';

// Queries
import { GetEmployeeQuery } from '../queries/GetEmployeeQuery';
import { GetEmployeesQuery } from '../queries/GetEmployeesQuery';
import { GetActiveShiftsQuery } from '../queries/GetActiveShiftsQuery';
import { GetDashboardStatsQuery } from '../queries/GetDashboardStatsQuery';

// Handlers
import { CreateEmployeeCommandHandler } from '../handlers/CreateEmployeeCommandHandler';
import { UpdateEmployeeCommandHandler } from '../handlers/UpdateEmployeeCommandHandler';
import { GetEmployeeQueryHandler } from '../handlers/GetEmployeeQueryHandler';
import { GetEmployeesQueryHandler } from '../handlers/GetEmployeesQueryHandler';

export class CQRSConfig {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Создаем экземпляры сервисов
    const employeeService = new EmployeeApplicationService();
    const shiftService = new ShiftApplicationService();

    // Регистрируем обработчики команд
    mediator.registerCommandHandler(
      'CreateEmployee',
      new CreateEmployeeCommandHandler(employeeService)
    );

    mediator.registerCommandHandler(
      'UpdateEmployee',
      new UpdateEmployeeCommandHandler(employeeService)
    );

    // Регистрируем обработчики запросов
    mediator.registerQueryHandler(
      'GetEmployee',
      new GetEmployeeQueryHandler(employeeService)
    );

    mediator.registerQueryHandler(
      'GetEmployees',
      new GetEmployeesQueryHandler(employeeService)
    );

    this.initialized = true;
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getRegisteredCommands(): string[] {
    return mediator.getRegisteredCommands();
  }

  static getRegisteredQueries(): string[] {
    return mediator.getRegisteredQueries();
  }
}

// Константы для типов команд и запросов
export const COMMAND_TYPES = {
  CREATE_EMPLOYEE: 'CreateEmployee',
  UPDATE_EMPLOYEE: 'UpdateEmployee',
  DELETE_EMPLOYEE: 'DeleteEmployee',
  START_SHIFT: 'StartShift',
  END_SHIFT: 'EndShift',
} as const;

export const QUERY_TYPES = {
  GET_EMPLOYEE: 'GetEmployee',
  GET_EMPLOYEES: 'GetEmployees',
  GET_ACTIVE_SHIFTS: 'GetActiveShifts',
  GET_DASHBOARD_STATS: 'GetDashboardStats',
} as const;



