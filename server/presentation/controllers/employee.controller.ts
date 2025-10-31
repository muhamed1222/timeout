// Контроллер для работы с сотрудниками

import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../../application/services';
// import {
//   createEmployeeSchema,
//   updateEmployeeSchema,
//   createInviteSchema,
//   employeeSearchSchema,
//   useInviteSchema,
//   linkTelegramSchema,
//   type CreateEmployeeInput,
//   type UpdateEmployeeInput,
//   type CreateInviteInput,
//   type EmployeeSearchInput,
//   type UseInviteInput,
//   type LinkTelegramInput,
// } from '../../application/validators';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  // Создать сотрудника
  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const data: CreateEmployeeInput = req.body;

      const employee = await this.employeeService.createEmployee(
        companyId,
        data
      );

      res.status(201).json({
        success: true,
        data: employee,
        message: 'Сотрудник успешно создан',
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить сотрудника по ID
  getEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const employee = await this.employeeService.getEmployee(id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'EMPLOYEE_NOT_FOUND',
          message: 'Сотрудник не найден',
        });
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить сотрудника по Telegram ID
  getEmployeeByTelegramId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { telegramId } = req.params;

      const employee =
        await this.employeeService.getEmployeeByTelegramId(telegramId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'EMPLOYEE_NOT_FOUND',
          message: 'Сотрудник не найден',
        });
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить всех сотрудников компании
  getEmployeesByCompany = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { companyId } = req.params;

      const employees =
        await this.employeeService.getEmployeesByCompany(companyId);

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  };

  // Обновить сотрудника
  updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: any = req.body;

      const employee = await this.employeeService.updateEmployee(id, data);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'EMPLOYEE_NOT_FOUND',
          message: 'Сотрудник не найден',
        });
      }

      res.json({
        success: true,
        data: employee,
        message: 'Сотрудник успешно обновлен',
      });
    } catch (error) {
      next(error);
    }
  };

  // Удалить сотрудника
  deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.employeeService.deleteEmployee(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Изменить статус сотрудника
  updateEmployeeStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const employee = await this.employeeService.updateEmployeeStatus(
        id,
        status
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'EMPLOYEE_NOT_FOUND',
          message: 'Сотрудник не найден',
        });
      }

      res.json({
        success: true,
        data: employee,
        message: 'Статус сотрудника успешно обновлен',
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить статистику сотрудника
  getEmployeeStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const stats = await this.employeeService.getEmployeeStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // Поиск сотрудников
  searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const searchDto: any = req.query as any;

      const employees = await this.employeeService.searchEmployees(
        companyId,
        searchDto
      );

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  };

  // Создать приглашение
  createInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Для публичных маршрутов companyId может быть в params или body
      const companyId = req.params.companyId || req.body.company_id;
      const data: any = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'COMPANY_ID_REQUIRED',
          message: 'ID компании обязателен',
        });
      }

      const invite = await this.employeeService.createInvite(companyId, data);

      res.status(201).json({
        success: true,
        data: invite,
        message: 'Приглашение успешно создано',
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить приглашение по коду
  getInviteByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      const invite = await this.employeeService.getInviteByCode(code);

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: 'INVITE_NOT_FOUND',
          message: 'Приглашение не найдено',
        });
      }

      res.json({
        success: true,
        data: invite,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить все приглашения компании
  getInvitesByCompany = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { companyId } = req.params;

      const invites = await this.employeeService.getInvitesByCompany(companyId);

      res.json({
        success: true,
        data: invites,
      });
    } catch (error) {
      next(error);
    }
  };

  // Использовать приглашение
  useInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteId } = req.params;
      const { employeeId } = req.body;

      const invite = await this.employeeService.useInvite(inviteId, employeeId);

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: 'INVITE_NOT_FOUND',
          message: 'Приглашение не найдено',
        });
      }

      res.json({
        success: true,
        data: invite,
        message: 'Приглашение успешно использовано',
      });
    } catch (error) {
      next(error);
    }
  };

  // Удалить приглашение
  deleteInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteId } = req.params;

      await this.employeeService.deleteInvite(inviteId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Получить ссылку на приглашение
  getInviteLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;

      const invite = await this.employeeService.getInviteByCode(code);

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: 'INVITE_NOT_FOUND',
          message: 'Приглашение не найдено',
        });
      }

      // Генерируем Telegram deep link для приглашения
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourBotName';
      const cleanBotUsername = botUsername.replace('@', '');
      const telegramDeepLink = `https://t.me/${cleanBotUsername}?start=${code}`;

      res.json({
        success: true,
        data: {
          invite,
          link: telegramDeepLink,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
