// Контроллер для сотрудников с CQRS

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../../../shared/types';
import { mediator } from '../../application/mediator/Mediator';
import { CQRSConfig, COMMAND_TYPES, QUERY_TYPES } from '../../application/config/CQRSConfig';
import { CreateEmployeeCommand } from '../../application/commands/CreateEmployeeCommand';
import { UpdateEmployeeCommand } from '../../application/commands/UpdateEmployeeCommand';
import { GetEmployeeQuery } from '../../application/queries/GetEmployeeQuery';
import { GetEmployeesQuery } from '../../application/queries/GetEmployeesQuery';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class EmployeeController {
  constructor() {
    // Инициализируем CQRS конфигурацию
    CQRSConfig.initialize();
  }

  // Получить сотрудников компании
  getEmployees = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const { status, search, limit, offset } = req.query;

      const query: GetEmployeesQuery = {
        companyId,
        status: status as any,
        searchQuery: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const result = await mediator.query<GetEmployeesQuery, any>({
        ...query,
        type: QUERY_TYPES.GET_EMPLOYEES
      });

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка получения сотрудников');
    }
  };

  // Получить сотрудника по ID
  getEmployee = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;

      const query: GetEmployeeQuery = {
        companyId,
        employeeId
      };

      const result = await mediator.query<GetEmployeeQuery, any>({
        ...query,
        type: QUERY_TYPES.GET_EMPLOYEE
      });

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка получения сотрудника');
    }
  };

  // Создать сотрудника
  createEmployee = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const employeeData = req.body;

      const command: CreateEmployeeCommand = {
        companyId,
        fullName: employeeData.full_name,
        position: employeeData.position,
        telegramUserId: employeeData.telegram_user_id,
        timezone: employeeData.tz || 'Europe/Moscow'
      };

      const result = await mediator.send<CreateEmployeeCommand, any>({
        ...command,
        type: COMMAND_TYPES.CREATE_EMPLOYEE
      });

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка создания сотрудника');
    }
  };

  // Обновить сотрудника
  updateEmployee = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;
      const updateData = req.body;

      const employee = await this.employeeService.updateEmployee(
        companyId,
        employeeId,
        updateData
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          message: 'Сотрудник не найден',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: employee,
      };

      res.json(response);
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка обновления сотрудника',
      });
    }
  };

  // Удалить сотрудника
  deleteEmployee = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;
      const deleted = await this.employeeService.deleteEmployee(
        companyId,
        employeeId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          message: 'Сотрудник не найден',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Сотрудник успешно удален',
      };

      res.json(response);
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка удаления сотрудника',
      });
    }
  };

  // Поиск сотрудников
  searchEmployees = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const searchDto = req.query;

      const employees = await this.employeeService.searchEmployees(
        companyId,
        searchDto
      );

      const response: ApiResponse = {
        success: true,
        data: employees,
      };

      res.json(response);
    } catch (error) {
      console.error('Search employees error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка поиска сотрудников',
      });
    }
  };

  // Привязать Telegram ID
  linkTelegram = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;
      const { telegram_user_id } = req.body;

      const employee = await this.employeeService.linkTelegram(
        companyId,
        employeeId,
        telegram_user_id
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          message: 'Сотрудник не найден',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: employee,
      };

      res.json(response);
    } catch (error) {
      console.error('Link telegram error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка привязки Telegram ID',
      });
    }
  };

  // Отвязать Telegram ID
  unlinkTelegram = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;

      const employee = await this.employeeService.unlinkTelegram(
        companyId,
        employeeId
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found',
          message: 'Сотрудник не найден',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: employee,
      };

      res.json(response);
    } catch (error) {
      console.error('Unlink telegram error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка отвязки Telegram ID',
      });
    }
  };

  // Получить статистику сотрудника
  getEmployeeStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, employeeId } = req.params;
      const statsDto = req.query;

      const stats = await this.employeeService.getEmployeeStats(
        companyId,
        employeeId,
        statsDto
      );

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      console.error('Get employee stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения статистики сотрудника',
      });
    }
  };

  // Получить приглашения компании
  getInvites = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const invites = await this.employeeService.getInvites(companyId);

      const response: ApiResponse = {
        success: true,
        data: invites,
      };

      res.json(response);
    } catch (error) {
      console.error('Get invites error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения приглашений',
      });
    }
  };

  // Получить приглашение по ID
  getInvite = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, inviteId } = req.params;
      const invite = await this.employeeService.getInvite(companyId, inviteId);

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: 'Invite not found',
          message: 'Приглашение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: invite,
      };

      res.json(response);
    } catch (error) {
      console.error('Get invite error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения приглашения',
      });
    }
  };

  // Создать приглашение
  createInvite = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const inviteData = req.body;

      const invite = await this.employeeService.createInvite(
        companyId,
        inviteData
      );

      const response: ApiResponse = {
        success: true,
        data: invite,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create invite error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка создания приглашения',
      });
    }
  };

  // Отменить приглашение
  cancelInvite = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, inviteId } = req.params;
      const cancelled = await this.employeeService.cancelInvite(
        companyId,
        inviteId
      );

      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Invite not found',
          message: 'Приглашение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Приглашение успешно отменено',
      };

      res.json(response);
    } catch (error) {
      console.error('Cancel invite error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка отмены приглашения',
      });
    }
  };

  // Использовать приглашение
  useInvite = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { inviteCode } = req.params;
      const { employeeId } = req.body;

      const invite = await this.employeeService.useInvite(
        inviteCode,
        employeeId
      );

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: 'Invite not found',
          message: 'Приглашение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: invite,
      };

      res.json(response);
    } catch (error) {
      console.error('Use invite error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка использования приглашения',
      });
    }
  };

  // Унифицированная обработка ошибок
  private handleError(error: any, res: Response, defaultMessage: string): void {
    console.error('Controller error:', error);

    if (error instanceof DomainException) {
      const statusCode = this.getStatusCodeForDomainException(error);
      res.status(statusCode).json({
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: defaultMessage,
      });
    }
  }

  // Определение HTTP статус кода для доменных исключений
  private getStatusCodeForDomainException(error: DomainException): number {
    switch (error.code) {
    case 'EMPLOYEE_NOT_FOUND':
    case 'SHIFT_NOT_FOUND':
    case 'COMPANY_NOT_FOUND':
      return 404;
    case 'EMPLOYEE_ALREADY_EXISTS':
    case 'ACTIVE_SHIFT_EXISTS':
      return 409;
    case 'INVALID_COMMAND':
    case 'INVALID_QUERY':
    case 'VALIDATION_ERROR':
      return 400;
    case 'AUTHORIZATION_ERROR':
      return 403;
    case 'AUTHENTICATION_ERROR':
      return 401;
    default:
      return 500;
    }
  }
}
