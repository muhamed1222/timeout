// Контроллер для отчетов
import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../application/services/report.service';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  // Получить все отчеты компании
  getDailyReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const { limit, offset } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };
      
      const reports = await this.reportService.getDailyReports(companyId, options);
      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  };

  // Получить отчет по ID
  getDailyReportById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      const report = await this.reportService.getDailyReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ 
          success: false, 
          message: 'Отчет не найден' 
        });
      }
      
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  // Получить отчет по ID смены
  getDailyReportByShiftId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shiftId } = req.params;
      const report = await this.reportService.getDailyReportByShiftId(shiftId);
      
      if (!report) {
        return res.status(404).json({ 
          success: false, 
          message: 'Отчет не найден' 
        });
      }
      
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  // Создать новый отчет
  createDailyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.reportService.createDailyReport(req.body);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  // Обновить отчет
  updateDailyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      const report = await this.reportService.updateDailyReport(reportId, req.body);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  // Удалить отчет
  deleteDailyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reportId } = req.params;
      await this.reportService.deleteDailyReport(reportId);
      res.json({ success: true, message: 'Отчет удален' });
    } catch (error) {
      next(error);
    }
  };
}




