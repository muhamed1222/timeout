import { UUID } from '../value-objects/UUID';
import { DomainException } from '../exceptions/DomainException';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export interface EmployeeProps {
  id: UUID;
  companyId: UUID;
  fullName: string;
  position: string;
  telegramUserId?: string;
  status: EmployeeStatus;
  timezone: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class Employee {
  private constructor(private props: EmployeeProps) {}

  static create(props: Omit<EmployeeProps, 'id' | 'createdAt' | 'status'>): Employee {
    return new Employee({
      ...props,
      id: UUID.generate(),
      status: 'active',
      createdAt: new Date()
    });
  }

  static fromPersistence(data: {
    id: string;
    company_id: string;
    full_name: string;
    position: string;
    telegram_user_id?: string;
    status: string;
    tz: string;
    created_at: string;
    updated_at?: string;
  }): Employee {
    return new Employee({
      id: new UUID(data.id),
      companyId: new UUID(data.company_id),
      fullName: data.full_name,
      position: data.position,
      telegramUserId: data.telegram_user_id,
      status: data.status as EmployeeStatus,
      timezone: data.tz,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    });
  }

  // Getters
  get id(): UUID {
    return this.props.id;
  }

  get companyId(): UUID {
    return this.props.companyId;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get position(): string {
    return this.props.position;
  }

  get telegramUserId(): string | undefined {
    return this.props.telegramUserId;
  }

  get status(): EmployeeStatus {
    return this.props.status;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Business methods
  updateProfile(fullName: string, position: string): void {
    if (!fullName.trim()) {
      throw new DomainException('Full name is required', 'INVALID_EMPLOYEE_DATA');
    }
    if (!position.trim()) {
      throw new DomainException('Position is required', 'INVALID_EMPLOYEE_DATA');
    }

    this.props.fullName = fullName.trim();
    this.props.position = position.trim();
    this.props.updatedAt = new Date();
  }

  linkTelegram(telegramUserId: string): void {
    if (this.props.telegramUserId) {
      throw new DomainException('Employee already has Telegram linked', 'TELEGRAM_ALREADY_LINKED');
    }
    this.props.telegramUserId = telegramUserId;
    this.props.updatedAt = new Date();
  }

  unlinkTelegram(): void {
    this.props.telegramUserId = undefined;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    if (this.props.status === 'active') {
      throw new DomainException('Employee is already active', 'EMPLOYEE_ALREADY_ACTIVE');
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.props.status === 'inactive') {
      throw new DomainException('Employee is already inactive', 'EMPLOYEE_ALREADY_INACTIVE');
    }
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  terminate(): void {
    if (this.props.status === 'terminated') {
      throw new DomainException('Employee is already terminated', 'EMPLOYEE_ALREADY_TERMINATED');
    }
    this.props.status = 'terminated';
    this.props.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  canStartShift(): boolean {
    return this.isActive() && !!this.props.telegramUserId;
  }

  // Persistence methods
  toPersistence(): {
    id: string;
    company_id: string;
    full_name: string;
    position: string;
    telegram_user_id?: string;
    status: string;
    tz: string;
    created_at: string;
    updated_at?: string;
    } {
    return {
      id: this.props.id.toString(),
      company_id: this.props.companyId.toString(),
      full_name: this.props.fullName,
      position: this.props.position,
      telegram_user_id: this.props.telegramUserId,
      status: this.props.status,
      tz: this.props.timezone,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt?.toISOString()
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      companyId: this.props.companyId.toString(),
      fullName: this.props.fullName,
      position: this.props.position,
      telegramUserId: this.props.telegramUserId,
      status: this.props.status,
      timezone: this.props.timezone,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt?.toISOString()
    };
  }
}



