import { GetEmployeeQuery, GetEmployeeQueryResult } from '../queries/GetEmployeeQuery';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class GetEmployeeQueryHandler {
  constructor(private employeeService: EmployeeApplicationService) {}

  async handle(query: GetEmployeeQuery): Promise<GetEmployeeQueryResult> {
    try {
      // Валидация запроса
      this.validateQuery(query);

      // Получение сотрудника
      const employee = await this.employeeService.getEmployeeById(query.employeeId);

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
          createdAt: employee.createdAt.toISOString(),
          updatedAt: employee.updatedAt?.toISOString()
        }
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        'Failed to get employee',
        'GET_EMPLOYEE_FAILED',
        { originalError: error, query }
      );
    }
  }

  private validateQuery(query: GetEmployeeQuery): void {
    if (!query.employeeId?.trim()) {
      throw new DomainException('Employee ID is required', 'INVALID_QUERY', { field: 'employeeId' });
    }
    if (!query.companyId?.trim()) {
      throw new DomainException('Company ID is required', 'INVALID_QUERY', { field: 'companyId' });
    }
  }
}



