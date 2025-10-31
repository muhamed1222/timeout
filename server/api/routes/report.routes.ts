// Маршруты для отчетов

import { Router } from 'express';
import { ReportController } from '../../presentation/controllers';
import {
  authMiddleware,
  validateCompanyAccess,
} from '../middleware/auth.middleware';
import {
  validateUUID,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const reportController = new ReportController();

// Применить middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Валидация companyId для всех маршрутов
router.use('/:companyId', validateUUID('companyId'));

// ========== Daily Reports ==========

// Получить все отчеты компании
router.get(
  '/:companyId/daily-reports',
  validateCompanyAccess,
  asyncHandler(reportController.getDailyReports)
);

// Создать новый отчет
router.post(
  '/:companyId/daily-reports',
  validateCompanyAccess,
  asyncHandler(reportController.createDailyReport)
);

// Получить отчет по ID смены
router.get(
  '/:companyId/daily-reports/shift/:shiftId',
  validateCompanyAccess,
  validateUUID('shiftId'),
  asyncHandler(reportController.getDailyReportByShiftId)
);

// Получить отчет по ID
router.get(
  '/:companyId/daily-reports/:reportId',
  validateCompanyAccess,
  validateUUID('reportId'),
  asyncHandler(reportController.getDailyReportById)
);

// Обновить отчет
router.patch(
  '/:companyId/daily-reports/:reportId',
  validateCompanyAccess,
  validateUUID('reportId'),
  asyncHandler(reportController.updateDailyReport)
);

// Удалить отчет
router.delete(
  '/:companyId/daily-reports/:reportId',
  validateCompanyAccess,
  validateUUID('reportId'),
  asyncHandler(reportController.deleteDailyReport)
);

export default router;




