// Публичные маршруты для приглашений сотрудников

import { Router } from 'express';
import { EmployeeController } from '../../presentation/controllers';
import {
  validateBody,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const employeeController = new EmployeeController();

// Создать приглашение
router.post(
  '/',
  validateBody({}),
  asyncHandler(employeeController.createInvite)
);

// Получить информацию о приглашении по коду
router.get(
  '/:code',
  asyncHandler(employeeController.getInviteByCode)
);

// Получить ссылку на приглашение
router.get(
  '/:code/link',
  asyncHandler(employeeController.getInviteLink)
);

// Удалить приглашение
router.delete(
  '/:id',
  asyncHandler(employeeController.deleteInvite)
);

// Использовать приглашение
router.post(
  '/:inviteCode/use',
  validateBody({}),
  asyncHandler(employeeController.useInvite)
);

export default router;



