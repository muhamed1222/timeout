// Контроллер для графиков работы
import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../../application/services/schedule.service';

export class ScheduleController {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  // ========== Schedule Templates ==========

  // Получить все шаблоны графиков компании
  getScheduleTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const templates = await this.scheduleService.getScheduleTemplates(companyId);
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  };

  // Получить шаблон графика по ID
  getScheduleTemplateById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const template = await this.scheduleService.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ 
          success: false, 
          message: 'Шаблон графика не найден' 
        });
      }
      
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  };

  // Создать новый шаблон графика
  createScheduleTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const data = {
        ...req.body,
        company_id: companyId
      };
      
      const template = await this.scheduleService.createScheduleTemplate(data);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  };

  // Обновить шаблон графика
  updateScheduleTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const template = await this.scheduleService.updateScheduleTemplate(templateId, req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  };

  // Удалить шаблон графика
  deleteScheduleTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      await this.scheduleService.deleteScheduleTemplate(templateId);
      res.json({ success: true, message: 'Шаблон графика удален' });
    } catch (error) {
      next(error);
    }
  };

  // ========== Employee Schedules ==========

  // Получить все графики сотрудников компании
  getEmployeeSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const schedules = await this.scheduleService.getEmployeeSchedules(companyId);
      res.json({ success: true, data: schedules });
    } catch (error) {
      next(error);
    }
  };

  // Получить графики конкретного сотрудника
  getEmployeeSchedulesByEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const schedules = await this.scheduleService.getEmployeeSchedulesByEmployeeId(employeeId);
      res.json({ success: true, data: schedules });
    } catch (error) {
      next(error);
    }
  };

  // Получить текущий активный график сотрудника
  getCurrentEmployeeSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const schedule = await this.scheduleService.getCurrentEmployeeSchedule(employeeId);
      
      if (!schedule) {
        return res.status(404).json({ 
          success: false, 
          message: 'Текущий график не найден' 
        });
      }
      
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  };

  // Назначить график сотруднику
  assignScheduleToEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await this.scheduleService.assignScheduleToEmployee(req.body);
      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  };

  // Обновить график сотрудника
  updateEmployeeSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId, validFrom } = req.params;
      const schedule = await this.scheduleService.updateEmployeeSchedule(
        employeeId,
        validFrom,
        req.body
      );
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  };

  // Удалить график сотрудника
  removeEmployeeSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId, validFrom } = req.params;
      await this.scheduleService.removeEmployeeSchedule(employeeId, validFrom);
      res.json({ success: true, message: 'График сотрудника удален' });
    } catch (error) {
      next(error);
    }
  };
}




