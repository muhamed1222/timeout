import { ShiftDomainService, CreateShiftData, StartShiftData, EndShiftData, ShiftSearchCriteria, ShiftStats } from '../../../shared/domain/services/ShiftDomainService';
import { Shift } from '../../../shared/domain/entities/Shift';
import { ShiftRepository } from '../../infrastructure/repositories/shift.repository';

export class ShiftApplicationService extends ShiftDomainService {
  private shiftRepo: ShiftRepository;

  constructor() {
    super();
    this.shiftRepo = new ShiftRepository();
  }

  // Implementation of abstract methods
  async findById(id: string): Promise<Shift | null> {
    const shiftData = await this.shiftRepo.findById(id);
    return shiftData ? Shift.fromPersistence(shiftData) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<Shift[]> {
    const shiftsData = await this.shiftRepo.findByEmployeeId(employeeId);
    return shiftsData.map(data => Shift.fromPersistence(data));
  }

  async findByCompanyId(companyId: string): Promise<Shift[]> {
    const shiftsData = await this.shiftRepo.findByCompanyId(companyId);
    return shiftsData.map(data => Shift.fromPersistence(data));
  }

  async findActiveByEmployeeId(employeeId: string): Promise<Shift | null> {
    const shiftData = await this.shiftRepo.findCurrentByEmployeeId(employeeId);
    return shiftData ? Shift.fromPersistence(shiftData) : null;
  }

  async save(shift: Shift): Promise<Shift> {
    const shiftData = shift.toPersistence();
    const savedData = await this.shiftRepo.save(shiftData);
    return Shift.fromPersistence(savedData);
  }

  async delete(id: string): Promise<void> {
    await this.shiftRepo.delete(id);
  }

  // Additional application-specific methods
  async createShiftForEmployee(employeeId: string, companyId: string, startTime: string, endTime: string): Promise<Shift> {
    const data: CreateShiftData = {
      employeeId,
      companyId,
      plannedStartAt: startTime,
      plannedEndAt: endTime
    };
    return this.createShift(data);
  }

  async startShiftWithLocation(id: string, location?: { latitude: number; longitude: number }): Promise<Shift> {
    const data: StartShiftData = { location };
    return this.startShift(id, data);
  }

  async endShiftWithNotes(id: string, notes?: string): Promise<Shift> {
    const data: EndShiftData = { notes };
    return this.endShift(id, data);
  }

  async getTodayShifts(companyId: string): Promise<Shift[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const criteria: ShiftSearchCriteria = {
      companyId,
      dateFrom: startOfDay.toISOString(),
      dateTo: endOfDay.toISOString()
    };

    return this.searchShifts(criteria);
  }

  async getEmployeeTodayShift(employeeId: string): Promise<Shift | null> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const shifts = await this.findByEmployeeId(employeeId);
    return shifts.find(shift => {
      const shiftDate = shift.plannedTimeRange.start;
      return shiftDate >= startOfDay && shiftDate < endOfDay;
    }) || null;
  }

  async getShiftsByDateRange(companyId: string, startDate: string, endDate: string): Promise<Shift[]> {
    const criteria: ShiftSearchCriteria = {
      companyId,
      dateFrom: startDate,
      dateTo: endDate
    };

    return this.searchShifts(criteria);
  }

  async getLateShifts(companyId: string): Promise<Shift[]> {
    const shifts = await this.findByCompanyId(companyId);
    return shifts.filter(shift => shift.isLate());
  }

  async getEarlyEndShifts(companyId: string): Promise<Shift[]> {
    const shifts = await this.findByCompanyId(companyId);
    return shifts.filter(shift => shift.isEarlyEnd());
  }

  async getShiftDurationStats(companyId: string): Promise<{
    averagePlannedDuration: number;
    averageActualDuration: number;
    totalOvertime: number;
    totalUndertime: number;
  }> {
    const shifts = await this.findByCompanyId(companyId);
    const completedShifts = shifts.filter(shift => shift.isCompleted());

    if (completedShifts.length === 0) {
      return {
        averagePlannedDuration: 0,
        averageActualDuration: 0,
        totalOvertime: 0,
        totalUndertime: 0
      };
    }

    const totalPlannedDuration = completedShifts.reduce((sum, shift) => sum + shift.getPlannedDurationInMinutes(), 0);
    const totalActualDuration = completedShifts.reduce((sum, shift) => sum + shift.getActualDurationInMinutes(), 0);

    const averagePlannedDuration = totalPlannedDuration / completedShifts.length;
    const averageActualDuration = totalActualDuration / completedShifts.length;

    let totalOvertime = 0;
    let totalUndertime = 0;

    completedShifts.forEach(shift => {
      const planned = shift.getPlannedDurationInMinutes();
      const actual = shift.getActualDurationInMinutes();
      const difference = actual - planned;

      if (difference > 0) {
        totalOvertime += difference;
      } else {
        totalUndertime += Math.abs(difference);
      }
    });

    return {
      averagePlannedDuration,
      averageActualDuration,
      totalOvertime,
      totalUndertime
    };
  }

  async getEmployeeShiftStats(employeeId: string): Promise<{
    totalShifts: number;
    completedShifts: number;
    activeShifts: number;
    cancelledShifts: number;
    averageDuration: number;
    totalLateMinutes: number;
  }> {
    const shifts = await this.findByEmployeeId(employeeId);
    const completedShifts = shifts.filter(shift => shift.isCompleted());

    const totalShifts = shifts.length;
    const completedShiftsCount = completedShifts.length;
    const activeShifts = shifts.filter(shift => shift.isActive()).length;
    const cancelledShifts = shifts.filter(shift => shift.isCancelled()).length;

    const averageDuration = completedShiftsCount > 0 
      ? completedShifts.reduce((sum, shift) => sum + shift.getActualDurationInMinutes(), 0) / completedShiftsCount
      : 0;

    const totalLateMinutes = completedShifts.reduce((sum, shift) => sum + Math.max(0, shift.getDelayInMinutes()), 0);

    return {
      totalShifts,
      completedShifts: completedShiftsCount,
      activeShifts,
      cancelledShifts,
      averageDuration,
      totalLateMinutes
    };
  }
}



