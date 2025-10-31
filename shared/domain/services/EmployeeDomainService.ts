import { Employee, EmployeeStatus } from '../entities/Employee';
import { UUID } from '../value-objects/UUID';
import { DomainException } from '../exceptions/DomainException';

export interface CreateEmployeeData {
  companyId: string;
  fullName: string;
  position: string;
  telegramUserId?: string;
  timezone: string;
}

export interface UpdateEmployeeData {
  fullName?: string;
  position?: string;
  telegramUserId?: string;
  timezone?: string;
  status?: EmployeeStatus;
}

export interface EmployeeSearchCriteria {
  companyId: string;
  status?: EmployeeStatus;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  terminated: number;
}

export abstract class EmployeeDomainService {
  // Abstract methods to be implemented by infrastructure layer
  abstract findById(id: string): Promise<Employee | null>;
  abstract findByCompanyId(companyId: string): Promise<Employee[]>;
  abstract findByTelegramId(telegramUserId: string): Promise<Employee | null>;
  abstract save(employee: Employee): Promise<Employee>;
  abstract delete(id: string): Promise<void>;

  // Business logic methods
  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    // Validate input
    this.validateCreateEmployeeData(data);

    // Check for duplicate Telegram ID
    if (data.telegramUserId) {
      const existingEmployee = await this.findByTelegramId(data.telegramUserId);
      if (existingEmployee) {
        throw new DomainException(
          `Employee with Telegram ID ${data.telegramUserId} already exists`,
          'EMPLOYEE_ALREADY_EXISTS',
          { telegramUserId: data.telegramUserId }
        );
      }
    }

    // Create employee
    const employee = Employee.create({
      companyId: new UUID(data.companyId),
      fullName: data.fullName,
      position: data.position,
      telegramUserId: data.telegramUserId,
      timezone: data.timezone
    });

    return this.save(employee);
  }

  async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
    const employee = await this.findById(id);
    if (!employee) {
      throw new DomainException(`Employee with ID ${id} not found`, 'EMPLOYEE_NOT_FOUND', { id });
    }

    // Validate input
    this.validateUpdateEmployeeData(data);

    // Check for duplicate Telegram ID if changing
    if (data.telegramUserId && data.telegramUserId !== employee.telegramUserId) {
      const existingEmployee = await this.findByTelegramId(data.telegramUserId);
      if (existingEmployee && !existingEmployee.id.equals(employee.id)) {
        throw new DomainException(
          `Employee with Telegram ID ${data.telegramUserId} already exists`,
          'EMPLOYEE_ALREADY_EXISTS',
          { telegramUserId: data.telegramUserId }
        );
      }
    }

    // Update employee
    if (data.fullName !== undefined) {
      employee.updateProfile(data.fullName, data.position || employee.position);
    }
    if (data.position !== undefined && data.fullName === undefined) {
      employee.updateProfile(employee.fullName, data.position);
    }
    if (data.telegramUserId !== undefined) {
      if (data.telegramUserId) {
        employee.linkTelegram(data.telegramUserId);
      } else {
        employee.unlinkTelegram();
      }
    }
    if (data.status !== undefined) {
      this.updateEmployeeStatus(employee, data.status);
    }

    return this.save(employee);
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await this.findById(id);
    if (!employee) {
      throw new DomainException(`Employee with ID ${id} not found`, 'EMPLOYEE_NOT_FOUND', { id });
    }

    // Check if employee can be deleted (business rules)
    if (employee.isActive()) {
      throw new DomainException(
        'Cannot delete active employee. Deactivate first.',
        'CANNOT_DELETE_ACTIVE_EMPLOYEE',
        { id }
      );
    }

    await this.delete(id);
  }

  async searchEmployees(criteria: EmployeeSearchCriteria): Promise<Employee[]> {
    const employees = await this.findByCompanyId(criteria.companyId);
    
    let filteredEmployees = employees;

    // Filter by status
    if (criteria.status) {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === criteria.status);
    }

    // Filter by search query
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.fullName.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query)
      );
    }

    // Apply pagination
    if (criteria.offset) {
      filteredEmployees = filteredEmployees.slice(criteria.offset);
    }
    if (criteria.limit) {
      filteredEmployees = filteredEmployees.slice(0, criteria.limit);
    }

    return filteredEmployees;
  }

  async getEmployeeStats(companyId: string): Promise<EmployeeStats> {
    const employees = await this.findByCompanyId(companyId);
    
    return {
      total: employees.length,
      active: employees.filter(emp => emp.status === 'active').length,
      inactive: employees.filter(emp => emp.status === 'inactive').length,
      terminated: employees.filter(emp => emp.status === 'terminated').length
    };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.findById(id);
    if (!employee) {
      throw new DomainException(`Employee with ID ${id} not found`, 'EMPLOYEE_NOT_FOUND', { id });
    }
    return employee;
  }

  // Private helper methods
  private validateCreateEmployeeData(data: CreateEmployeeData): void {
    if (!data.companyId || !UUID.isValid(data.companyId)) {
      throw new DomainException('Invalid company ID', 'INVALID_COMPANY_ID', { companyId: data.companyId });
    }
    if (!data.fullName?.trim()) {
      throw new DomainException('Full name is required', 'INVALID_EMPLOYEE_DATA', { field: 'fullName' });
    }
    if (!data.position?.trim()) {
      throw new DomainException('Position is required', 'INVALID_EMPLOYEE_DATA', { field: 'position' });
    }
    if (!data.timezone?.trim()) {
      throw new DomainException('Timezone is required', 'INVALID_EMPLOYEE_DATA', { field: 'timezone' });
    }
  }

  private validateUpdateEmployeeData(data: UpdateEmployeeData): void {
    if (data.fullName !== undefined && !data.fullName?.trim()) {
      throw new DomainException('Full name cannot be empty', 'INVALID_EMPLOYEE_DATA', { field: 'fullName' });
    }
    if (data.position !== undefined && !data.position?.trim()) {
      throw new DomainException('Position cannot be empty', 'INVALID_EMPLOYEE_DATA', { field: 'position' });
    }
    if (data.timezone !== undefined && !data.timezone?.trim()) {
      throw new DomainException('Timezone cannot be empty', 'INVALID_EMPLOYEE_DATA', { field: 'timezone' });
    }
  }

  private updateEmployeeStatus(employee: Employee, status: EmployeeStatus): void {
    switch (status) {
    case 'active':
      employee.activate();
      break;
    case 'inactive':
      employee.deactivate();
      break;
    case 'terminated':
      employee.terminate();
      break;
    default:
      throw new DomainException(`Invalid status: ${status}`, 'INVALID_STATUS', { status });
    }
  }
}



