import { CreateEmployeeCommand, CreateEmployeeCommandResult } from '../commands/CreateEmployeeCommand';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class CreateEmployeeCommandHandler {
  constructor(private employeeService: EmployeeApplicationService) {}

  async handle(command: CreateEmployeeCommand): Promise<CreateEmployeeCommandResult> {
    try {
      // Валидация команды
      this.validateCommand(command);

      // Создание сотрудника
      const employee = await this.employeeService.createEmployee({
        companyId: command.companyId,
        fullName: command.fullName,
        position: command.position,
        telegramUserId: command.telegramUserId,
        timezone: command.timezone
      });

      // Возврат результата
      return {
        employee: {
          id: employee.id.toString(),
          companyId: employee.companyId.toString(),
          fullName: employee.fullName,
          position: employee.position,
          telegramUserId: employee.telegramUserId,
          status: employee.status,
          timezone: employee.timezone,
          createdAt: employee.createdAt.toISOString()
        }
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        'Failed to create employee',
        'CREATE_EMPLOYEE_FAILED',
        { originalError: error, command }
      );
    }
  }

  private validateCommand(command: CreateEmployeeCommand): void {
    if (!command.companyId?.trim()) {
      throw new DomainException('Company ID is required', 'INVALID_COMMAND', { field: 'companyId' });
    }
    if (!command.fullName?.trim()) {
      throw new DomainException('Full name is required', 'INVALID_COMMAND', { field: 'fullName' });
    }
    if (!command.position?.trim()) {
      throw new DomainException('Position is required', 'INVALID_COMMAND', { field: 'position' });
    }
    if (!command.timezone?.trim()) {
      throw new DomainException('Timezone is required', 'INVALID_COMMAND', { field: 'timezone' });
    }
  }
}



