// Маршруты для графиков работы

import { Router } from 'express';
import { ScheduleController } from '../../presentation/controllers';
import {
  authMiddleware,
  validateCompanyAccess,
} from '../middleware/auth.middleware';
import {
  validateUUID,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const scheduleController = new ScheduleController();

// Применить middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Валидация companyId для всех маршрутов
router.use('/:companyId', validateUUID('companyId'));

// ========== Schedule Templates ==========

// Получить все шаблоны графиков компании
router.get(
  '/:companyId/schedule-templates',
  validateCompanyAccess,
  asyncHandler(scheduleController.getScheduleTemplates)
);

// Создать новый шаблон графика
router.post(
  '/:companyId/schedule-templates',
  validateCompanyAccess,
  asyncHandler(scheduleController.createScheduleTemplate)
);

// Получить шаблон графика по ID
router.get(
  '/:companyId/schedule-templates/:templateId',
  validateCompanyAccess,
  validateUUID('templateId'),
  asyncHandler(scheduleController.getScheduleTemplateById)
);

// Обновить шаблон графика
router.patch(
  '/:companyId/schedule-templates/:templateId',
  validateCompanyAccess,
  validateUUID('templateId'),
  asyncHandler(scheduleController.updateScheduleTemplate)
);

// Удалить шаблон графика
router.delete(
  '/:companyId/schedule-templates/:templateId',
  validateCompanyAccess,
  validateUUID('templateId'),
  asyncHandler(scheduleController.deleteScheduleTemplate)
);

// ========== Employee Schedules ==========

// Получить все графики сотрудников компании
router.get(
  '/:companyId/employee-schedule',
  validateCompanyAccess,
  asyncHandler(scheduleController.getEmployeeSchedules)
);

// Назначить график сотруднику
router.post(
  '/:companyId/employee-schedule',
  validateCompanyAccess,
  asyncHandler(scheduleController.assignScheduleToEmployee)
);

// Получить графики конкретного сотрудника
router.get(
  '/:companyId/employees/:employeeId/schedule',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(scheduleController.getEmployeeSchedulesByEmployeeId)
);

// Получить текущий активный график сотрудника
router.get(
  '/:companyId/employees/:employeeId/schedule/current',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(scheduleController.getCurrentEmployeeSchedule)
);

// Обновить график сотрудника
router.patch(
  '/:companyId/employees/:employeeId/schedule/:validFrom',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(scheduleController.updateEmployeeSchedule)
);

// Удалить график сотрудника
router.delete(
  '/:companyId/employees/:employeeId/schedule/:validFrom',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(scheduleController.removeEmployeeSchedule)
);

export default router;




