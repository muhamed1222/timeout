// Контроллер для компании

import { Response } from 'express';
import { CompanyService } from '../../services';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../../../shared/types';
import { LoggerUtils } from '../../lib/logger.js';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  // Получить компанию
  getCompany = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const company = await this.companyService.getCompany(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
          message: 'Компания не найдена',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: company,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'getCompany' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения компании',
      });
    }
  };

  // Обновить компанию
  updateCompany = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const updateData = req.body;

      const company = await this.companyService.updateCompany(
        companyId,
        updateData
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
          message: 'Компания не найдена',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: company,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'updateCompany' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка обновления компании',
      });
    }
  };

  // Получить статистику компании
  getStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const stats = await this.companyService.getStats(companyId);

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'getCompanyStats' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения статистики компании',
      });
    }
  };

  // Получить исключения компании
  getExceptions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const filters = req.query;
      const exceptions = await this.companyService.getExceptions(
        companyId,
        filters
      );

      const response: ApiResponse = {
        success: true,
        data: exceptions,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'getExceptions' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения исключений',
      });
    }
  };

  // Создать исключение
  createException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const exceptionData = req.body;

      const exception = await this.companyService.createException(
        companyId,
        exceptionData
      );

      const response: ApiResponse = {
        success: true,
        data: exception,
      };

      res.status(201).json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'createException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка создания исключения',
      });
    }
  };

  // Получить исключение по ID
  getException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, exceptionId } = req.params;
      const exception = await this.companyService.getException(
        companyId,
        exceptionId
      );

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          message: 'Исключение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: exception,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'getException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка получения исключения',
      });
    }
  };

  // Обновить исключение
  updateException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, exceptionId } = req.params;
      const updateData = req.body;

      const exception = await this.companyService.updateException(
        companyId,
        exceptionId,
        updateData
      );

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          message: 'Исключение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: exception,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'updateException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка обновления исключения',
      });
    }
  };

  // Удалить исключение
  deleteException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, exceptionId } = req.params;
      const deleted = await this.companyService.deleteException(
        companyId,
        exceptionId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          message: 'Исключение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Исключение успешно удалено',
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'deleteException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка удаления исключения',
      });
    }
  };

  // Одобрить исключение
  approveException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, exceptionId } = req.params;
      const { approvedBy } = req.body;

      const exception = await this.companyService.approveException(
        companyId,
        exceptionId,
        approvedBy
      );

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          message: 'Исключение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: exception,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'approveException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка одобрения исключения',
      });
    }
  };

  // Отклонить исключение
  rejectException = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, exceptionId } = req.params;
      const { approvedBy } = req.body;

      const exception = await this.companyService.rejectException(
        companyId,
        exceptionId,
        approvedBy
      );

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found',
          message: 'Исключение не найдено',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: exception,
      };

      res.json(response);
    } catch (error) {
      LoggerUtils.logError(error as Error, { method: 'rejectException' });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Ошибка отклонения исключения',
      });
    }
  };
}
