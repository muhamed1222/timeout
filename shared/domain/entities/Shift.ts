import { UUID } from '../value-objects/UUID';
import { TimeRange } from '../value-objects/TimeRange';
import { Location } from '../value-objects/Location';
import { DomainException } from '../exceptions/DomainException';

export type ShiftStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface ShiftProps {
  id: UUID;
  employeeId: UUID;
  companyId: UUID;
  plannedTimeRange: TimeRange;
  actualTimeRange?: TimeRange;
  status: ShiftStatus;
  location?: Location;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class Shift {
  private constructor(private props: ShiftProps) {}

  static create(props: Omit<ShiftProps, 'id' | 'status' | 'createdAt'>): Shift {
    return new Shift({
      ...props,
      id: UUID.generate(),
      status: 'planned',
      createdAt: new Date()
    });
  }

  static fromPersistence(data: {
    id: string;
    employee_id: string;
    company_id: string;
    planned_start_at: string;
    planned_end_at: string;
    actual_start_at?: string;
    actual_end_at?: string;
    status: string;
    location?: { latitude: number; longitude: number };
    notes?: string;
    created_at: string;
    updated_at?: string;
  }): Shift {
    return new Shift({
      id: new UUID(data.id),
      employeeId: new UUID(data.employee_id),
      companyId: new UUID(data.company_id),
      plannedTimeRange: TimeRange.fromISOString(data.planned_start_at, data.planned_end_at),
      actualTimeRange: data.actual_start_at && data.actual_end_at 
        ? TimeRange.fromISOString(data.actual_start_at, data.actual_end_at)
        : undefined,
      status: data.status as ShiftStatus,
      location: data.location ? Location.fromObject(data.location) : undefined,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    });
  }

  // Getters
  get id(): UUID {
    return this.props.id;
  }

  get employeeId(): UUID {
    return this.props.employeeId;
  }

  get companyId(): UUID {
    return this.props.companyId;
  }

  get plannedTimeRange(): TimeRange {
    return this.props.plannedTimeRange;
  }

  get actualTimeRange(): TimeRange | undefined {
    return this.props.actualTimeRange;
  }

  get status(): ShiftStatus {
    return this.props.status;
  }

  get location(): Location | undefined {
    return this.props.location;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Business methods
  start(location?: Location): void {
    if (this.props.status !== 'planned') {
      throw new DomainException(`Cannot start shift with status: ${this.props.status}`, 'INVALID_SHIFT_STATUS');
    }

    const now = new Date();
    this.props.actualTimeRange = new TimeRange(now, now); // End time will be set when shift ends
    this.props.status = 'active';
    this.props.location = location;
    this.props.updatedAt = new Date();
  }

  end(): void {
    if (this.props.status !== 'active') {
      throw new DomainException(`Cannot end shift with status: ${this.props.status}`, 'INVALID_SHIFT_STATUS');
    }

    const now = new Date();
    if (this.props.actualTimeRange) {
      this.props.actualTimeRange = new TimeRange(this.props.actualTimeRange.start, now);
    }
    this.props.status = 'completed';
    this.props.updatedAt = new Date();
  }

  cancel(reason?: string): void {
    if (this.props.status === 'completed') {
      throw new DomainException('Cannot cancel completed shift', 'INVALID_SHIFT_STATUS');
    }

    this.props.status = 'cancelled';
    if (reason) {
      this.props.notes = reason;
    }
    this.props.updatedAt = new Date();
  }

  addNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  updateLocation(location: Location): void {
    this.props.location = location;
    this.props.updatedAt = new Date();
  }

  // Status checks
  isPlanned(): boolean {
    return this.props.status === 'planned';
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  isCancelled(): boolean {
    return this.props.status === 'cancelled';
  }

  // Time calculations
  getPlannedDurationInMinutes(): number {
    return this.props.plannedTimeRange.getDurationInMinutes();
  }

  getActualDurationInMinutes(): number {
    if (!this.props.actualTimeRange) {
      return 0;
    }
    return this.props.actualTimeRange.getDurationInMinutes();
  }

  getDelayInMinutes(): number {
    if (!this.props.actualTimeRange) {
      return 0;
    }
    return Math.floor(
      (this.props.actualTimeRange.start.getTime() - this.props.plannedTimeRange.start.getTime()) / (1000 * 60)
    );
  }

  isLate(): boolean {
    return this.getDelayInMinutes() > 0;
  }

  isEarlyEnd(): boolean {
    if (!this.props.actualTimeRange) {
      return false;
    }
    const earlyMinutes = Math.floor(
      (this.props.plannedTimeRange.end.getTime() - this.props.actualTimeRange.end.getTime()) / (1000 * 60)
    );
    return earlyMinutes > 0;
  }

  // Persistence methods
  toPersistence(): {
    id: string;
    employee_id: string;
    company_id: string;
    planned_start_at: string;
    planned_end_at: string;
    actual_start_at?: string;
    actual_end_at?: string;
    status: string;
    location?: { latitude: number; longitude: number };
    notes?: string;
    created_at: string;
    updated_at?: string;
    } {
    return {
      id: this.props.id.toString(),
      employee_id: this.props.employeeId.toString(),
      company_id: this.props.companyId.toString(),
      planned_start_at: this.props.plannedTimeRange.start.toISOString(),
      planned_end_at: this.props.plannedTimeRange.end.toISOString(),
      actual_start_at: this.props.actualTimeRange?.start.toISOString(),
      actual_end_at: this.props.actualTimeRange?.end.toISOString(),
      status: this.props.status,
      location: this.props.location?.toJSON(),
      notes: this.props.notes,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt?.toISOString()
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      employeeId: this.props.employeeId.toString(),
      companyId: this.props.companyId.toString(),
      plannedTimeRange: this.props.plannedTimeRange.toJSON(),
      actualTimeRange: this.props.actualTimeRange?.toJSON(),
      status: this.props.status,
      location: this.props.location?.toJSON(),
      notes: this.props.notes,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt?.toISOString()
    };
  }
}



