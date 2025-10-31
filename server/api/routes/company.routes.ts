// Маршруты для компании

import { Router } from 'express';
import { CompanyController } from '../../presentation/controllers';
import {
  authMiddleware,
  validateCompanyAccess,
} from '../middleware/auth.middleware';
import {
  validateUUID,
  validateBody,
  validatePagination,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

// Заглушка для схемы валидации
const updateCompanySchema = {
  validate: () => (req: any, res: any, next: any) => next()
};

// import {
//   createCompanySchema,
//   updateCompanySchema,
//   companySettingsSchema,
//   companyIdSchema,
//   ownerIdSchema,
// } from '../../application/validators';
// import { validateParams } from '../../presentation/middleware/validation.middleware';

const router = Router();
const companyController = new CompanyController();

// Применить middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Валидация companyId для всех маршрутов
router.use('/:companyId', validateUUID('companyId'));
router.use('/:companyId', validateCompanyAccess);

// Получить компанию
router.get('/:companyId', asyncHandler(companyController.getCompany));

// Обновить компанию
router.patch(
  '/:companyId',
  validateBody(updateCompanySchema),
  asyncHandler(companyController.updateCompany)
);

// Получить статистику компании
router.get('/:companyId/stats', asyncHandler(companyController.getCompanyStats));

// Получить активные смены
router.get('/:companyId/shifts/active', asyncHandler(companyController.getActiveShifts));

// Маршруты для исключений
router.get(
  '/:companyId/exceptions',
  validatePagination,
  asyncHandler(companyController.getExceptions)
);

export default router;
