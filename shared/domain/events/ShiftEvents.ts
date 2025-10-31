import { BaseEvent } from './BaseEvent';
import { UUID } from '../value-objects/UUID';
import { Location } from '../value-objects/Location';

// Событие начала смены
export class ShiftStartedEvent extends BaseEvent {
  constructor(
    public readonly shiftId: UUID,
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly plannedStartAt: Date,
    public readonly actualStartAt: Date,
    public readonly location?: Location
  ) {
    super();
  }

  getEventType(): string {
    return 'ShiftStarted';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shiftId: this.shiftId.toString(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      plannedStartAt: this.plannedStartAt.toISOString(),
      actualStartAt: this.actualStartAt.toISOString(),
      location: this.location?.toJSON()
    };
  }
}

// Событие завершения смены
export class ShiftEndedEvent extends BaseEvent {
  constructor(
    public readonly shiftId: UUID,
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly plannedEndAt: Date,
    public readonly actualEndAt: Date,
    public readonly duration: number, // в минутах
    public readonly notes?: string
  ) {
    super();
  }

  getEventType(): string {
    return 'ShiftEnded';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shiftId: this.shiftId.toString(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      plannedEndAt: this.plannedEndAt.toISOString(),
      actualEndAt: this.actualEndAt.toISOString(),
      duration: this.duration,
      notes: this.notes
    };
  }
}

// Событие отмены смены
export class ShiftCancelledEvent extends BaseEvent {
  constructor(
    public readonly shiftId: UUID,
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly reason?: string
  ) {
    super();
  }

  getEventType(): string {
    return 'ShiftCancelled';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shiftId: this.shiftId.toString(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      reason: this.reason
    };
  }
}

// Событие нарушения смены
export class ShiftViolationDetectedEvent extends BaseEvent {
  constructor(
    public readonly shiftId: UUID,
    public readonly employeeId: UUID,
    public readonly companyId: UUID,
    public readonly violationType: 'late_start' | 'early_end' | 'missed_shift' | 'long_break',
    public readonly severity: 1 | 2 | 3,
    public readonly details: Record<string, unknown>
  ) {
    super();
  }

  getEventType(): string {
    return 'ShiftViolationDetected';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shiftId: this.shiftId.toString(),
      employeeId: this.employeeId.toString(),
      companyId: this.companyId.toString(),
      violationType: this.violationType,
      severity: this.severity,
      details: this.details
    };
  }
}



