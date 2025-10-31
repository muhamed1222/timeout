import { BaseEvent } from './BaseEvent';
import { UUID } from '../value-objects/UUID';

// Событие создания сотрудника
export class EmployeeCreatedEvent extends BaseEvent {
  constructor(
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly fullName: string,
    public readonly position: string,
    public readonly telegramUserId?: string
  ) {
    super();
  }

  getEventType(): string {
    return 'EmployeeCreated';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      fullName: this.fullName,
      position: this.position,
      telegramUserId: this.telegramUserId
    };
  }
}

// Событие обновления сотрудника
export class EmployeeUpdatedEvent extends BaseEvent {
  constructor(
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly changes: {
      fullName?: string;
      position?: string;
      telegramUserId?: string;
      status?: string;
    }
  ) {
    super();
  }

  getEventType(): string {
    return 'EmployeeUpdated';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      changes: this.changes
    };
  }
}

// Событие удаления сотрудника
export class EmployeeDeletedEvent extends BaseEvent {
  constructor(
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly fullName: string
  ) {
    super();
  }

  getEventType(): string {
    return 'EmployeeDeleted';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      fullName: this.fullName
    };
  }
}

// Событие активации сотрудника
export class EmployeeActivatedEvent extends BaseEvent {
  constructor(
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly fullName: string
  ) {
    super();
  }

  getEventType(): string {
    return 'EmployeeActivated';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      fullName: this.fullName
    };
  }
}

// Событие деактивации сотрудника
export class EmployeeDeactivatedEvent extends BaseEvent {
  constructor(
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly fullName: string
  ) {
    super();
  }

  getEventType(): string {
    return 'EmployeeDeactivated';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      fullName: this.fullName
    };
  }
}



