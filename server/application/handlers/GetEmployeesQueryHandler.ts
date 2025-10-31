import { GetEmployeesQuery, GetEmployeesQueryResult } from '../queries/GetEmployeesQuery';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class GetEmployeesQueryHandler {
  constructor(private employeeService: EmployeeApplicationService) {}

  async handle(query: GetEmployeesQuery): Promise<GetEmployeesQueryResult> {
    try {
      // Валидация запроса
      this.validateQuery(query);

      // Поиск сотрудников
      const employees = await this.employeeService.searchEmployees({
        companyId: query.companyId,
        status: query.status,
        searchQuery: query.searchQuery,
        limit: query.limit,
        offset: query.offset
      });

      // Получение общего количества для пагинации
      const allEmployees = await this.employeeService.findByCompanyId(query.companyId);
      const total = allEmployees.length;
      const hasMore = query.offset ? (query.offset + (query.limit || 0)) < total : false;

      // Возврат результата
      return {
        employees: employees.map(employee => ({
          id: employee.id.toString(),
          companyId: employee.companyId.toString(),
          fullName: employee.fullName,
          position: employee.position,
          telegramUserId: employee.telegramUserId,
          status: employee.status,
          timezone: employee.timezone,
          createdAt: employee.createdAt.toISOString(),
          updatedAt: employee.updatedAt?.toISOString()
        })),
        total,
        hasMore
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        'Failed to get employees',
        'GET_EMPLOYEES_FAILED',
        { originalError: error, query }
      );
    }
  }

  private validateQuery(query: GetEmployeesQuery): void {
    if (!query.companyId?.trim()) {
      throw new DomainException('Company ID is required', 'INVALID_QUERY', { field: 'companyId' });
    }
  }
}



