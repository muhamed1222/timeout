import { EmployeeDomainService, CreateEmployeeData, UpdateEmployeeData, EmployeeSearchCriteria, EmployeeStats } from '../../../shared/domain/services/EmployeeDomainService';
import { Employee } from '../../../shared/domain/entities/Employee';
import { EmployeeRepository } from '../../infrastructure/repositories/employee.repository';
import { EmployeeInviteRepository } from '../../infrastructure/repositories/employee.repository';
import { eventBus } from '../events/EventBus';
import { EmployeeCreatedEvent, EmployeeUpdatedEvent, EmployeeDeletedEvent } from '../../../shared/domain/events/EmployeeEvents';
import { Cacheable, CacheEvict, KeyGenerators, CacheConditions } from '../cache/CacheDecorators';
import { CacheConfig, CACHE_TTL, CACHE_TAGS } from '../cache/CacheConfig';

export class EmployeeApplicationService extends EmployeeDomainService {
  private employeeRepo: EmployeeRepository;
  private inviteRepo: EmployeeInviteRepository;

  constructor() {
    super();
    this.employeeRepo = new EmployeeRepository();
    this.inviteRepo = new EmployeeInviteRepository();
  }

  // Implementation of abstract methods
  @Cacheable({
    cacheName: 'employees',
    keyGenerator: KeyGenerators.byId,
    condition: CacheConditions.onlySuccess,
    ttl: CACHE_TTL.EMPLOYEE,
    tags: [CACHE_TAGS.EMPLOYEE]
  })
  async findById(id: string): Promise<Employee | null> {
    const employeeData = await this.employeeRepo.findById(id);
    return employeeData ? Employee.fromPersistence(employeeData) : null;
  }

  @Cacheable({
    cacheName: 'employees',
    keyGenerator: KeyGenerators.byCompany,
    condition: CacheConditions.onlyNonEmpty,
    ttl: CACHE_TTL.EMPLOYEE,
    tags: [CACHE_TAGS.EMPLOYEE]
  })
  async findByCompanyId(companyId: string): Promise<Employee[]> {
    const employeesData = await this.employeeRepo.findByCompanyId(companyId);
    return employeesData.map(data => Employee.fromPersistence(data));
  }

  async findByTelegramId(telegramUserId: string): Promise<Employee | null> {
    const employeeData = await this.employeeRepo.findByTelegramId(telegramUserId);
    return employeeData ? Employee.fromPersistence(employeeData) : null;
  }

  @CacheEvict({
    cacheName: 'employees',
    tags: [CACHE_TAGS.EMPLOYEE],
    allEntries: false
  })
  async save(employee: Employee): Promise<Employee> {
    const employeeData = employee.toPersistence();
    const savedData = await this.employeeRepo.save(employeeData);
    const savedEmployee = Employee.fromPersistence(savedData);
    
    // Публикуем событие создания сотрудника
    await eventBus.publish(new EmployeeCreatedEvent(
      savedEmployee.id,
      savedEmployee.companyId,
      savedEmployee.fullName,
      savedEmployee.position,
      savedEmployee.telegramUserId
    ));
    
    return savedEmployee;
  }

  async delete(id: string): Promise<void> {
    await this.employeeRepo.delete(id);
  }

  // Additional application-specific methods
  async createEmployeeWithInvite(data: CreateEmployeeData): Promise<{ employee: Employee; inviteCode: string }> {
    // Create employee
    const employee = await this.createEmployee(data);

    // Generate invite code
    const inviteCode = this.generateInviteCode();

    // Create invite
    await this.inviteRepo.create({
      employee_id: employee.id.toString(),
      company_id: employee.companyId.toString(),
      code: inviteCode,
      full_name: employee.fullName,
      position: employee.position,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { employee, inviteCode };
  }

  async getEmployeeWithStats(employeeId: string): Promise<{
    employee: Employee;
    stats: {
      totalShifts: number;
      activeShifts: number;
      completedShifts: number;
      averageRating: number;
    };
  }> {
    const employee = await this.getEmployeeById(employeeId);
    
    // Get employee statistics (this would need to be implemented in repositories)
    const stats = {
      totalShifts: 0, // TODO: Implement
      activeShifts: 0, // TODO: Implement
      completedShifts: 0, // TODO: Implement
      averageRating: 0, // TODO: Implement
    };

    return { employee, stats };
  }

  async getEmployeesByStatus(companyId: string, status: string): Promise<Employee[]> {
    const criteria: EmployeeSearchCriteria = {
      companyId,
      status: status as any
    };
    return this.searchEmployees(criteria);
  }

  async getEmployeesWithTelegram(companyId: string): Promise<Employee[]> {
    const employees = await this.findByCompanyId(companyId);
    return employees.filter(emp => emp.telegramUserId);
  }

  async linkEmployeeTelegram(employeeId: string, telegramUserId: string): Promise<Employee> {
    return this.updateEmployee(employeeId, { telegramUserId });
  }

  async unlinkEmployeeTelegram(employeeId: string): Promise<Employee> {
    return this.updateEmployee(employeeId, { telegramUserId: undefined });
  }

  async activateEmployee(employeeId: string): Promise<Employee> {
    return this.updateEmployee(employeeId, { status: 'active' });
  }

  async deactivateEmployee(employeeId: string): Promise<Employee> {
    return this.updateEmployee(employeeId, { status: 'inactive' });
  }

  async terminateEmployee(employeeId: string): Promise<Employee> {
    return this.updateEmployee(employeeId, { status: 'terminated' });
  }

  // Private helper methods
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
