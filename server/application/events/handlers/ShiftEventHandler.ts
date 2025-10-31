// Обработчики событий смен
import { IEventHandler } from '../EventBus';
import { 
  ShiftStartedEvent, 
  ShiftEndedEvent, 
  ShiftCancelledEvent, 
  ShiftViolationDetectedEvent 
} from '../../../../shared/domain/events/ShiftEvents';

export class ShiftEventHandler implements IEventHandler {
  // Обработка начала смены
  async handleShiftStarted(event: ShiftStartedEvent): Promise<void> {
    console.log(`Shift started: ${event.shiftId.toString()}`);
    
    // Логирование начала смены
    await this.logToAuditSystem({
      action: 'SHIFT_STARTED',
      shiftId: event.shiftId.toString(),
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        plannedStartAt: event.plannedStartAt.toISOString(),
        actualStartAt: event.actualStartAt.toISOString(),
        location: event.location?.toJSON()
      }
    });

    // Проверка на опоздание
    const delayMinutes = Math.floor(
      (event.actualStartAt.getTime() - event.plannedStartAt.getTime()) / (1000 * 60)
    );

    if (delayMinutes > 5) { // Опоздание более 5 минут
      // Можно отправить уведомление администратору
      await this.notifyLateStart(event, delayMinutes);
    }
  }

  // Обработка завершения смены
  async handleShiftEnded(event: ShiftEndedEvent): Promise<void> {
    console.log(`Shift ended: ${event.shiftId.toString()}`);
    
    // Логирование завершения смены
    await this.logToAuditSystem({
      action: 'SHIFT_ENDED',
      shiftId: event.shiftId.toString(),
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        plannedEndAt: event.plannedEndAt.toISOString(),
        actualEndAt: event.actualEndAt.toISOString(),
        duration: event.duration,
        notes: event.notes
      }
    });

    // Проверка на раннее завершение
    const earlyEndMinutes = Math.floor(
      (event.plannedEndAt.getTime() - event.actualEndAt.getTime()) / (1000 * 60)
    );

    if (earlyEndMinutes > 15) { // Раннее завершение более 15 минут
      await this.notifyEarlyEnd(event, earlyEndMinutes);
    }
  }

  // Обработка отмены смены
  async handleShiftCancelled(event: ShiftCancelledEvent): Promise<void> {
    console.log(`Shift cancelled: ${event.shiftId.toString()}`);
    
    // Логирование отмены смены
    await this.logToAuditSystem({
      action: 'SHIFT_CANCELLED',
      shiftId: event.shiftId.toString(),
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        reason: event.reason
      }
    });
  }

  // Обработка нарушения смены
  async handleShiftViolationDetected(event: ShiftViolationDetectedEvent): Promise<void> {
    console.log(`Shift violation detected: ${event.violationType} for shift ${event.shiftId.toString()}`);
    
    // Логирование нарушения
    await this.logToAuditSystem({
      action: 'SHIFT_VIOLATION_DETECTED',
      shiftId: event.shiftId.toString(),
      employeeId: event.employeeId.toString(),
      companyId: event.companyId.toString(),
      details: {
        violationType: event.violationType,
        severity: event.severity,
        ...event.details
      }
    });

    // Уведомление о нарушении
    await this.notifyViolation(event);
  }

  // Универсальный обработчик
  async handle(event: any): Promise<void> {
    switch (event.getEventType()) {
    case 'ShiftStarted':
      await this.handleShiftStarted(event);
      break;
    case 'ShiftEnded':
      await this.handleShiftEnded(event);
      break;
    case 'ShiftCancelled':
      await this.handleShiftCancelled(event);
      break;
    case 'ShiftViolationDetected':
      await this.handleShiftViolationDetected(event);
      break;
    default:
      console.warn(`Unknown shift event type: ${event.getEventType()}`);
    }
  }

  // Уведомление об опоздании
  private async notifyLateStart(event: ShiftStartedEvent, delayMinutes: number): Promise<void> {
    console.log(`Late start notification: Employee ${event.employeeId.toString()} is ${delayMinutes} minutes late`);
    // Здесь можно отправить уведомление в Telegram, email или другую систему
  }

  // Уведомление о раннем завершении
  private async notifyEarlyEnd(event: ShiftEndedEvent, earlyEndMinutes: number): Promise<void> {
    console.log(`Early end notification: Employee ${event.employeeId.toString()} ended ${earlyEndMinutes} minutes early`);
    // Здесь можно отправить уведомление
  }

  // Уведомление о нарушении
  private async notifyViolation(event: ShiftViolationDetectedEvent): Promise<void> {
    console.log(`Violation notification: ${event.violationType} (severity ${event.severity}) for employee ${event.employeeId.toString()}`);
    // Здесь можно отправить уведомление администратору
  }

  // Логирование в систему аудита
  private async logToAuditSystem(data: {
    action: string;
    shiftId: string;
    employeeId: string;
    companyId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    // Здесь можно интегрироваться с системой аудита
    console.log('Audit log:', data);
  }
}



