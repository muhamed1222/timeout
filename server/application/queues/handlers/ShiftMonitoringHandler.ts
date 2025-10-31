// Обработчик задач мониторинга смен
import { IQueueJobHandler, QueueJob, QueueJobResult } from '../QueueJob';
import { ShiftApplicationService } from '../../services/ShiftApplicationService';
import { EmployeeApplicationService } from '../../services/EmployeeApplicationService';
import { eventBus } from '../../events/EventBus';
import { ShiftViolationDetectedEvent } from '../../../../shared/domain/events/ShiftEvents';
import { DomainException } from '../../../../shared/domain/exceptions/DomainException';

export class ShiftMonitoringHandler implements IQueueJobHandler {
  constructor(
    private shiftService: ShiftApplicationService,
    private employeeService: EmployeeApplicationService
  ) {}

  async handle(job: QueueJob): Promise<QueueJobResult> {
    try {
      const { companyId, employeeId, shiftId, companies } = job.payload as {
        companyId?: string;
        employeeId?: string;
        shiftId?: string;
        companies?: string[];
      };

      // Если передан конкретный companyId, работаем с ним
      if (companyId) {
        return await this.handleSingleCompany(job.type, companyId, employeeId, shiftId);
      }

      // Если передан массив компаний, работаем со всеми
      if (companies && companies.length > 0) {
        const results = [];
        for (const compId of companies) {
          try {
            const result = await this.handleSingleCompany(job.type, compId, employeeId, shiftId);
            results.push(result);
          } catch (error) {
            console.error(`Error processing company ${compId}:`, error);
            results.push({ success: false, error: error.message });
          }
        }
        return { success: true, results };
      }

      // Если ничего не передано, получаем все компании из базы
      const storage = await import('../../../storage.js');
      const allCompanies = await storage.default.getAllCompanies();
      
      if (allCompanies.length === 0) {
        return { success: true, message: 'No companies found' };
      }

      const results = [];
      for (const company of allCompanies) {
        try {
          const result = await this.handleSingleCompany(job.type, company.id, employeeId, shiftId);
          results.push(result);
        } catch (error) {
          console.error(`Error processing company ${company.id}:`, error);
          results.push({ success: false, error: error.message });
        }
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('Error in ShiftMonitoringHandler:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retry: true
      };
    }
  }

  private async handleSingleCompany(jobType: string, companyId: string, employeeId?: string, shiftId?: string): Promise<QueueJobResult> {
    switch (jobType) {
    case 'MONITOR_LATE_STARTS':
      return await this.monitorLateStarts(companyId);
      
    case 'MONITOR_EARLY_ENDS':
      return await this.monitorEarlyEnds(companyId);
      
    case 'MONITOR_MISSED_SHIFTS':
      return await this.monitorMissedShifts(companyId);
      
    case 'MONITOR_ACTIVE_SHIFTS':
      return await this.monitorActiveShifts(companyId);
      
    case 'CHECK_SPECIFIC_SHIFT':
      if (!shiftId) {
        throw new DomainException('Shift ID is required for CHECK_SPECIFIC_SHIFT', 'INVALID_JOB_PAYLOAD');
      }
      return await this.checkSpecificShift(shiftId);
      
    default:
      throw new DomainException(`Unknown job type: ${jobType}`, 'UNKNOWN_JOB_TYPE');
    }
  }

  // Мониторинг опозданий
  private async monitorLateStarts(companyId: string): Promise<QueueJobResult> {
    try {
      const todayShifts = await this.shiftService.getTodayShifts(companyId);
      const violations = [];

      for (const shift of todayShifts) {
        if (shift.status === 'active' && shift.actualTimeRange?.start) {
          const plannedStart = shift.plannedTimeRange.start;
          const actualStart = shift.actualTimeRange.start;
          const delayMinutes = Math.floor(
            (actualStart.getTime() - plannedStart.getTime()) / (1000 * 60)
          );

          if (delayMinutes > 5) { // Опоздание более 5 минут
            violations.push({
              shiftId: shift.id.toString(),
              employeeId: shift.employeeId.toString(),
              delayMinutes,
              severity: delayMinutes > 30 ? 3 : delayMinutes > 15 ? 2 : 1
            });

            // Публикуем событие нарушения
            await eventBus.publish(new ShiftViolationDetectedEvent(
              shift.id,
              shift.employeeId,
              shift.companyId,
              'late_start',
              delayMinutes > 30 ? 3 : delayMinutes > 15 ? 2 : 1,
              {
                plannedStart: plannedStart.toISOString(),
                actualStart: actualStart.toISOString(),
                delayMinutes
              }
            ));
          }
        }
      }

      console.log(`Late start monitoring completed. Found ${violations.length} violations.`);
      
      return {
        success: true,
        data: { violations }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Мониторинг ранних завершений
  private async monitorEarlyEnds(companyId: string): Promise<QueueJobResult> {
    try {
      const todayShifts = await this.shiftService.getTodayShifts(companyId);
      const violations = [];

      for (const shift of todayShifts) {
        if (shift.status === 'completed' && shift.actualTimeRange?.end) {
          const plannedEnd = shift.plannedTimeRange.end;
          const actualEnd = shift.actualTimeRange.end;
          const earlyEndMinutes = Math.floor(
            (plannedEnd.getTime() - actualEnd.getTime()) / (1000 * 60)
          );

          if (earlyEndMinutes > 15) { // Раннее завершение более 15 минут
            violations.push({
              shiftId: shift.id.toString(),
              employeeId: shift.employeeId.toString(),
              earlyEndMinutes,
              severity: earlyEndMinutes > 60 ? 3 : earlyEndMinutes > 30 ? 2 : 1
            });

            // Публикуем событие нарушения
            await eventBus.publish(new ShiftViolationDetectedEvent(
              shift.id,
              shift.employeeId,
              shift.companyId,
              'early_end',
              earlyEndMinutes > 60 ? 3 : earlyEndMinutes > 30 ? 2 : 1,
              {
                plannedEnd: plannedEnd.toISOString(),
                actualEnd: actualEnd.toISOString(),
                earlyEndMinutes
              }
            ));
          }
        }
      }

      console.log(`Early end monitoring completed. Found ${violations.length} violations.`);
      
      return {
        success: true,
        data: { violations }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Мониторинг пропущенных смен
  private async monitorMissedShifts(companyId: string): Promise<QueueJobResult> {
    try {
      const todayShifts = await this.shiftService.getTodayShifts(companyId);
      const violations = [];

      for (const shift of todayShifts) {
        if (shift.status === 'planned') {
          const now = new Date();
          const plannedStart = shift.plannedTimeRange.start;
          const timeSincePlannedStart = Math.floor(
            (now.getTime() - plannedStart.getTime()) / (1000 * 60)
          );

          // Если прошло более 30 минут после запланированного начала
          if (timeSincePlannedStart > 30) {
            violations.push({
              shiftId: shift.id.toString(),
              employeeId: shift.employeeId.toString(),
              timeSincePlannedStart,
              severity: timeSincePlannedStart > 120 ? 3 : timeSincePlannedStart > 60 ? 2 : 1
            });

            // Публикуем событие нарушения
            await eventBus.publish(new ShiftViolationDetectedEvent(
              shift.id,
              shift.employeeId,
              shift.companyId,
              'missed_shift',
              timeSincePlannedStart > 120 ? 3 : timeSincePlannedStart > 60 ? 2 : 1,
              {
                plannedStart: plannedStart.toISOString(),
                timeSincePlannedStart
              }
            ));
          }
        }
      }

      console.log(`Missed shift monitoring completed. Found ${violations.length} violations.`);
      
      return {
        success: true,
        data: { violations }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Мониторинг активных смен
  private async monitorActiveShifts(companyId: string): Promise<QueueJobResult> {
    try {
      const activeShifts = await this.shiftService.getActiveShifts(companyId);
      const violations = [];

      for (const shift of activeShifts) {
        if (shift.actualTimeRange?.start) {
          const now = new Date();
          const actualStart = shift.actualTimeRange.start;
          const workingTime = Math.floor(
            (now.getTime() - actualStart.getTime()) / (1000 * 60)
          );

          // Проверяем на слишком долгую работу без перерыва (более 4 часов)
          if (workingTime > 240) { // 4 часа в минутах
            violations.push({
              shiftId: shift.id.toString(),
              employeeId: shift.employeeId.toString(),
              workingTime,
              severity: workingTime > 480 ? 3 : workingTime > 360 ? 2 : 1 // 8 и 6 часов
            });

            // Публикуем событие нарушения
            await eventBus.publish(new ShiftViolationDetectedEvent(
              shift.id,
              shift.employeeId,
              shift.companyId,
              'long_break',
              workingTime > 480 ? 3 : workingTime > 360 ? 2 : 1,
              {
                actualStart: actualStart.toISOString(),
                workingTime
              }
            ));
          }
        }
      }

      console.log(`Active shift monitoring completed. Found ${violations.length} violations.`);
      
      return {
        success: true,
        data: { violations }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Проверка конкретной смены
  private async checkSpecificShift(shiftId: string): Promise<QueueJobResult> {
    try {
      const shift = await this.shiftService.findById(shiftId);
      
      if (!shift) {
        return {
          success: false,
          error: 'Shift not found'
        };
      }

      const violations = [];
      const now = new Date();

      // Проверяем различные типы нарушений
      if (shift.status === 'active' && shift.actualTimeRange?.start) {
        const plannedStart = shift.plannedTimeRange.start;
        const actualStart = shift.actualTimeRange.start;
        const delayMinutes = Math.floor(
          (actualStart.getTime() - plannedStart.getTime()) / (1000 * 60)
        );

        if (delayMinutes > 5) {
          violations.push({
            type: 'late_start',
            delayMinutes,
            severity: delayMinutes > 30 ? 3 : delayMinutes > 15 ? 2 : 1
          });
        }
      }

      if (shift.status === 'completed' && shift.actualTimeRange?.end) {
        const plannedEnd = shift.plannedTimeRange.end;
        const actualEnd = shift.actualTimeRange.end;
        const earlyEndMinutes = Math.floor(
          (plannedEnd.getTime() - actualEnd.getTime()) / (1000 * 60)
        );

        if (earlyEndMinutes > 15) {
          violations.push({
            type: 'early_end',
            earlyEndMinutes,
            severity: earlyEndMinutes > 60 ? 3 : earlyEndMinutes > 30 ? 2 : 1
          });
        }
      }

      return {
        success: true,
        data: { 
          shiftId: shift.id.toString(),
          violations 
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
