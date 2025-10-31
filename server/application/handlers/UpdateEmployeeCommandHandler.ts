import { UpdateEmployeeCommand, UpdateEmployeeCommandResult } from '../commands/UpdateEmployeeCommand';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class UpdateEmployeeCommandHandler {
  constructor(private employeeService: EmployeeApplicationService) {}

  async handle(command: UpdateEmployeeCommand): Promise<UpdateEmployeeCommandResult> {
    try {
      // Валидация команды
      this.validateCommand(command);

      // Обновление сотрудника
      const employee = await this.employeeService.updateEmployee(command.employeeId, {
        fullName: command.fullName,
        position: command.position,
        telegramUserId: command.telegramUserId,
        timezone: command.timezone,
        status: command.status
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
          updatedAt: employee.updatedAt?.toISOString() || new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        'Failed to update employee',
        'UPDATE_EMPLOYEE_FAILED',
        { originalError: error, command }
      );
    }
  }

  private validateCommand(command: UpdateEmployeeCommand): void {
    if (!command.employeeId?.trim()) {
      throw new DomainException('Employee ID is required', 'INVALID_COMMAND', { field: 'employeeId' });
    }
    if (!command.companyId?.trim()) {
      throw new DomainException('Company ID is required', 'INVALID_COMMAND', { field: 'companyId' });
    }
    if (command.fullName !== undefined && !command.fullName?.trim()) {
      throw new DomainException('Full name cannot be empty', 'INVALID_COMMAND', { field: 'fullName' });
    }
    if (command.position !== undefined && !command.position?.trim()) {
      throw new DomainException('Position cannot be empty', 'INVALID_COMMAND', { field: 'position' });
    }
    if (command.timezone !== undefined && !command.timezone?.trim()) {
      throw new DomainException('Timezone cannot be empty', 'INVALID_COMMAND', { field: 'timezone' });
    }
  }
}



