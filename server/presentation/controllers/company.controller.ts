// Контроллер для работы с компаниями

import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../../application/services';
// import {
//   createCompanySchema,
//   updateCompanySchema,
//   companySettingsSchema,
//   companyIdSchema,
//   ownerIdSchema,
//   type CreateCompanyInput,
//   type UpdateCompanyInput,
//   type CompanySettingsInput,
// } from '../../application/validators';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  // Создать компанию
  createCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateCompanyInput = req.body;
      const company = await this.companyService.createCompany(data);

      res.status(201).json({
        success: true,
        data: company,
        message: 'Компания успешно создана',
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить компанию по ID
  getCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const company = await this.companyService.getCompany(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'COMPANY_NOT_FOUND',
          message: 'Компания не найдена',
        });
      }

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить все компании
  getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companies = await this.companyService.getAllCompanies();

      res.json({
        success: true,
        data: companies,
      });
    } catch (error) {
      next(error);
    }
  };

  // Обновить компанию
  updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateCompanyInput = req.body;

      const company = await this.companyService.updateCompany(id, data);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'COMPANY_NOT_FOUND',
          message: 'Компания не найдена',
        });
      }

      res.json({
        success: true,
        data: company,
        message: 'Компания успешно обновлена',
      });
    } catch (error) {
      next(error);
    }
  };

  // Удалить компанию
  deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.companyService.deleteCompany(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Обновить настройки компании
  updateCompanySettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const settings: CompanySettingsInput = req.body;

      const company = await this.companyService.updateCompanySettings(
        id,
        settings
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'COMPANY_NOT_FOUND',
          message: 'Компания не найдена',
        });
      }

      res.json({
        success: true,
        data: company,
        message: 'Настройки компании успешно обновлены',
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить статистику компании
  getCompanyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;

      const stats = await this.companyService.getCompanyStats(companyId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить активные смены компании
  getActiveShifts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;

      const shifts = await this.companyService.getActiveShifts(companyId);

      res.json({
        success: true,
        data: shifts || [],
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить компании по владельцу
  getCompaniesByOwner = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { ownerId } = req.params;

      const companies = await this.companyService.getCompaniesByOwner(ownerId);

      res.json({
        success: true,
        data: companies,
      });
    } catch (error) {
      next(error);
    }
  };

  // Получить исключения компании
  getExceptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const exceptions = await this.companyService.getExceptions(companyId, page, limit);

      res.json({
        success: true,
        data: exceptions,
      });
    } catch (error) {
      next(error);
    }
  };
}
