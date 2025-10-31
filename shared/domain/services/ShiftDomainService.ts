import { Shift, ShiftStatus } from '../entities/Shift';
import { Employee } from '../entities/Employee';
import { UUID } from '../value-objects/UUID';
import { TimeRange } from '../value-objects/TimeRange';
import { Location } from '../value-objects/Location';
import { DomainException } from '../exceptions/DomainException';

export interface CreateShiftData {
  employeeId: string;
  companyId: string;
  plannedStartAt: string;
  plannedEndAt: string;
  location?: { latitude: number; longitude: number };
}

export interface StartShiftData {
  location?: { latitude: number; longitude: number };
}

export interface EndShiftData {
  notes?: string;
}

export interface ShiftSearchCriteria {
  companyId: string;
  employeeId?: string;
  status?: ShiftStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ShiftStats {
  total: number;
  planned: number;
  active: number;
  completed: number;
  cancelled: number;
}

export abstract class ShiftDomainService {
  // Abstract methods to be implemented by infrastructure layer
  abstract findById(id: string): Promise<Shift | null>;
  abstract findByEmployeeId(employeeId: string): Promise<Shift[]>;
  abstract findByCompanyId(companyId: string): Promise<Shift[]>;
  abstract findActiveByEmployeeId(employeeId: string): Promise<Shift | null>;
  abstract save(shift: Shift): Promise<Shift>;
  abstract delete(id: string): Promise<void>;

  // Business logic methods
  async createShift(data: CreateShiftData): Promise<Shift> {
    // Validate input
    this.validateCreateShiftData(data);

    // Check if employee has active shift
    const activeShift = await this.findActiveByEmployeeId(data.employeeId);
    if (activeShift) {
      throw new DomainException(
        `Employee ${data.employeeId} already has an active shift`,
        'ACTIVE_SHIFT_EXISTS',
        { employeeId: data.employeeId, activeShiftId: activeShift.id.toString() }
      );
    }

    // Create shift
    const shift = Shift.create({
      employeeId: new UUID(data.employeeId),
      companyId: new UUID(data.companyId),
      plannedTimeRange: TimeRange.fromISOString(data.plannedStartAt, data.plannedEndAt),
      location: data.location ? Location.fromObject(data.location) : undefined
    });

    return this.save(shift);
  }

  async startShift(id: string, data: StartShiftData): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }

    // Check if shift can be started
    if (!shift.isPlanned()) {
      throw new DomainException(
        `Cannot start shift with status: ${shift.status}`,
        'INVALID_SHIFT_STATUS',
        { id, status: shift.status }
      );
    }

    // Check if employee has another active shift
    const activeShift = await this.findActiveByEmployeeId(shift.employeeId.toString());
    if (activeShift && !activeShift.id.equals(shift.id)) {
      throw new DomainException(
        'Employee already has an active shift',
        'ACTIVE_SHIFT_EXISTS',
        { employeeId: shift.employeeId.toString(), activeShiftId: activeShift.id.toString() }
      );
    }

    // Start shift
    const location = data.location ? Location.fromObject(data.location) : undefined;
    shift.start(location);

    return this.save(shift);
  }

  async endShift(id: string, data: EndShiftData): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }

    // Check if shift can be ended
    if (!shift.isActive()) {
      throw new DomainException(
        `Cannot end shift with status: ${shift.status}`,
        'INVALID_SHIFT_STATUS',
        { id, status: shift.status }
      );
    }

    // End shift
    shift.end();
    if (data.notes) {
      shift.addNotes(data.notes);
    }

    return this.save(shift);
  }

  async cancelShift(id: string, reason?: string): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }

    // Check if shift can be cancelled
    if (shift.isCompleted()) {
      throw new DomainException(
        'Cannot cancel completed shift',
        'INVALID_SHIFT_STATUS',
        { id, status: shift.status }
      );
    }

    // Cancel shift
    shift.cancel(reason);

    return this.save(shift);
  }

  async updateShiftLocation(id: string, location: { latitude: number; longitude: number }): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }

    // Check if shift is active
    if (!shift.isActive()) {
      throw new DomainException(
        `Cannot update location for shift with status: ${shift.status}`,
        'INVALID_SHIFT_STATUS',
        { id, status: shift.status }
      );
    }

    // Update location
    shift.updateLocation(Location.fromObject(location));

    return this.save(shift);
  }

  async addShiftNotes(id: string, notes: string): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }

    // Add notes
    shift.addNotes(notes);

    return this.save(shift);
  }

  async searchShifts(criteria: ShiftSearchCriteria): Promise<Shift[]> {
    let shifts: Shift[];

    if (criteria.employeeId) {
      shifts = await this.findByEmployeeId(criteria.employeeId);
    } else {
      shifts = await this.findByCompanyId(criteria.companyId);
    }

    // Filter by status
    if (criteria.status) {
      shifts = shifts.filter(shift => shift.status === criteria.status);
    }

    // Filter by date range
    if (criteria.dateFrom || criteria.dateTo) {
      const fromDate = criteria.dateFrom ? new Date(criteria.dateFrom) : new Date(0);
      const toDate = criteria.dateTo ? new Date(criteria.dateTo) : new Date();

      shifts = shifts.filter(shift => {
        const shiftDate = shift.plannedTimeRange.start;
        return shiftDate >= fromDate && shiftDate <= toDate;
      });
    }

    // Apply pagination
    if (criteria.offset) {
      shifts = shifts.slice(criteria.offset);
    }
    if (criteria.limit) {
      shifts = shifts.slice(0, criteria.limit);
    }

    return shifts;
  }

  async getShiftStats(companyId: string): Promise<ShiftStats> {
    const shifts = await this.findByCompanyId(companyId);
    
    return {
      total: shifts.length,
      planned: shifts.filter(shift => shift.status === 'planned').length,
      active: shifts.filter(shift => shift.status === 'active').length,
      completed: shifts.filter(shift => shift.status === 'completed').length,
      cancelled: shifts.filter(shift => shift.status === 'cancelled').length
    };
  }

  async getActiveShifts(companyId: string): Promise<Shift[]> {
    const shifts = await this.findByCompanyId(companyId);
    return shifts.filter(shift => shift.isActive());
  }

  async getShiftById(id: string): Promise<Shift> {
    const shift = await this.findById(id);
    if (!shift) {
      throw new DomainException(`Shift with ID ${id} not found`, 'SHIFT_NOT_FOUND', { id });
    }
    return shift;
  }

  // Private helper methods
  private validateCreateShiftData(data: CreateShiftData): void {
    if (!data.employeeId || !UUID.isValid(data.employeeId)) {
      throw new DomainException('Invalid employee ID', 'INVALID_EMPLOYEE_ID', { employeeId: data.employeeId });
    }
    if (!data.companyId || !UUID.isValid(data.companyId)) {
      throw new DomainException('Invalid company ID', 'INVALID_COMPANY_ID', { companyId: data.companyId });
    }
    if (!data.plannedStartAt || !data.plannedEndAt) {
      throw new DomainException('Planned start and end times are required', 'INVALID_SHIFT_DATA');
    }

    try {
      const startDate = new Date(data.plannedStartAt);
      const endDate = new Date(data.plannedEndAt);
      
      if (startDate >= endDate) {
        throw new DomainException('Planned start time must be before end time', 'INVALID_SHIFT_DATA');
      }
    } catch (error) {
      throw new DomainException('Invalid date format', 'INVALID_SHIFT_DATA');
    }
  }
}



