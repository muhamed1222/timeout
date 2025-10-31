// Маршруты для сотрудников

import { Router } from 'express';
import { EmployeeController } from '../../presentation/controllers';
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

const router = Router();
const employeeController = new EmployeeController();

// Применить middleware аутентификации к защищенным маршрутам
router.use(authMiddleware);

// Валидация companyId для всех маршрутов
router.use('/:companyId', validateUUID('companyId'));
router.use('/:companyId', validateCompanyAccess);

// Получить сотрудников компании
router.get(
  '/:companyId/employees',
  validatePagination,
  asyncHandler(employeeController.getEmployeesByCompany)
);

// Поиск сотрудников
router.get(
  '/:companyId/employees/search',
  asyncHandler(employeeController.searchEmployees)
);

// Создать сотрудника
router.post(
  '/:companyId/employees',
  validateBody({}),
  asyncHandler(employeeController.createEmployee)
);

// Валидация employeeId для маршрутов сотрудников
router.use('/:companyId/employees/:employeeId', validateUUID('employeeId'));

router.get(
  '/:companyId/employees/:employeeId',
  asyncHandler(employeeController.getEmployee)
);
router.patch(
  '/:companyId/employees/:employeeId',
  validateBody({}),
  asyncHandler(employeeController.updateEmployee)
);
router.delete(
  '/:companyId/employees/:employeeId',
  asyncHandler(employeeController.deleteEmployee)
);

// Статистика сотрудника
router.get(
  '/:companyId/employees/:employeeId/stats',
  asyncHandler(employeeController.getEmployeeStats)
);

// Привязка Telegram
router.post(
  '/:companyId/employees/:employeeId/link-telegram',
  validateBody({}),
  asyncHandler(employeeController.linkTelegram)
);
router.post(
  '/:companyId/employees/:employeeId/unlink-telegram',
  asyncHandler(employeeController.unlinkTelegram)
);

// Маршруты для приглашений
router.get('/:companyId/invites', asyncHandler(employeeController.getInvitesByCompany));
router.post(
  '/:companyId/invites',
  validateBody({}),
  asyncHandler(employeeController.createInvite)
);

// Валидация inviteId для маршрутов приглашений
router.use('/:companyId/invites/:inviteId', validateUUID('inviteId'));

router.get(
  '/:companyId/invites/:inviteId',
  asyncHandler(employeeController.getInviteByCode)
);
router.delete(
  '/:companyId/invites/:inviteId',
  asyncHandler(employeeController.deleteInvite)
);

export default router;
