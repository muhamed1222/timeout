import { StartShiftCommand, StartShiftCommandResult } from '../commands/StartShiftCommand';
import { ShiftApplicationService } from '../services/ShiftApplicationService';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class StartShiftCommandHandler {
  constructor(private shiftService: ShiftApplicationService) {}

  async handle(command: StartShiftCommand): Promise<StartShiftCommandResult> {
    try {
      // Валидация команды
      this.validateCommand(command);

      // Начало смены
      const shift = await this.shiftService.startShiftWithLocation(command.shiftId, command.location);

      // Возврат результата
      return {
        shift: {
          id: shift.id.toString(),
          employeeId: shift.employeeId.toString(),
          companyId: shift.companyId.toString(),
          status: shift.status,
          actualStartAt: shift.actualTimeRange?.start.toISOString() || '',
          location: shift.location?.toJSON()
        }
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException(
        'Failed to start shift',
        'START_SHIFT_FAILED',
        { originalError: error, command }
      );
    }
  }

  private validateCommand(command: StartShiftCommand): void {
    if (!command.shiftId?.trim()) {
      throw new DomainException('Shift ID is required', 'INVALID_COMMAND', { field: 'shiftId' });
    }
    if (!command.companyId?.trim()) {
      throw new DomainException('Company ID is required', 'INVALID_COMMAND', { field: 'companyId' });
    }
  }
}



