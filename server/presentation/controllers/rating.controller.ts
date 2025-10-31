// Контроллер для рейтинга и нарушений
import { Request, Response, NextFunction } from 'express';
import { RatingService } from '../../application/services/rating.service';

export class RatingController {
  private ratingService: RatingService;

  constructor() {
    this.ratingService = new RatingService();
  }

  // ========== Violation Rules ==========

  getViolationRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const rules = await this.ratingService.getViolationRules(companyId);
      res.json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  };

  getActiveViolationRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const rules = await this.ratingService.getActiveViolationRules(companyId);
      res.json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  };

  getViolationRuleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ruleId } = req.params;
      const rule = await this.ratingService.getViolationRuleById(ruleId);
      
      if (!rule) {
        return res.status(404).json({ 
          success: false, 
          message: 'Правило не найдено' 
        });
      }
      
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  };

  createViolationRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const data = {
        ...req.body,
        company_id: companyId
      };
      
      const rule = await this.ratingService.createViolationRule(data);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  };

  updateViolationRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ruleId } = req.params;
      const rule = await this.ratingService.updateViolationRule(ruleId, req.body);
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  };

  deleteViolationRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ruleId } = req.params;
      await this.ratingService.deleteViolationRule(ruleId);
      res.json({ success: true, message: 'Правило удалено' });
    } catch (error) {
      next(error);
    }
  };

  // ========== Violations ==========

  getViolations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const { limit, offset } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };
      
      const violations = await this.ratingService.getViolations(companyId, options);
      res.json({ success: true, data: violations });
    } catch (error) {
      next(error);
    }
  };

  getEmployeeViolations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const { limit, offset } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };
      
      const violations = await this.ratingService.getEmployeeViolations(employeeId, options);
      res.json({ success: true, data: violations });
    } catch (error) {
      next(error);
    }
  };

  getViolationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { violationId } = req.params;
      const violation = await this.ratingService.getViolationById(violationId);
      
      if (!violation) {
        return res.status(404).json({ 
          success: false, 
          message: 'Нарушение не найдено' 
        });
      }
      
      res.json({ success: true, data: violation });
    } catch (error) {
      next(error);
    }
  };

  createViolation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const data = {
        ...req.body,
        company_id: companyId
      };
      
      const violation = await this.ratingService.createViolation(data);
      res.status(201).json({ success: true, data: violation });
    } catch (error) {
      next(error);
    }
  };

  updateViolation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { violationId } = req.params;
      const violation = await this.ratingService.updateViolation(violationId, req.body);
      res.json({ success: true, data: violation });
    } catch (error) {
      next(error);
    }
  };

  deleteViolation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { violationId } = req.params;
      await this.ratingService.deleteViolation(violationId);
      res.json({ success: true, message: 'Нарушение удалено' });
    } catch (error) {
      next(error);
    }
  };

  // ========== Employee Rating ==========

  getEmployeeRatings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const { limit, offset } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };
      
      const ratings = await this.ratingService.getEmployeeRatings(companyId, options);
      res.json({ success: true, data: ratings });
    } catch (error) {
      next(error);
    }
  };

  getEmployeeRatingHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const ratings = await this.ratingService.getEmployeeRatingHistory(employeeId);
      res.json({ success: true, data: ratings });
    } catch (error) {
      next(error);
    }
  };

  getCurrentEmployeeRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const rating = await this.ratingService.getCurrentEmployeeRating(employeeId);
      
      if (!rating) {
        return res.status(404).json({ 
          success: false, 
          message: 'Текущий рейтинг не найден' 
        });
      }
      
      res.json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  };

  createEmployeeRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const data = {
        ...req.body,
        company_id: companyId
      };
      
      const rating = await this.ratingService.createEmployeeRating(data);
      res.status(201).json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  };

  updateEmployeeRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ratingId } = req.params;
      const rating = await this.ratingService.updateEmployeeRating(ratingId, req.body);
      res.json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  };

  calculateEmployeeRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const { period_start, period_end } = req.query;
      
      if (!period_start || !period_end) {
        return res.status(400).json({ 
          success: false, 
          message: 'Период (period_start и period_end) обязателен' 
        });
      }
      
      const rating = await this.ratingService.calculateEmployeeRating(
        employeeId,
        period_start as string,
        period_end as string
      );
      
      res.json({ success: true, data: { rating } });
    } catch (error) {
      next(error);
    }
  };
}




