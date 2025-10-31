// Маршруты для рейтинга и нарушений

import { Router } from 'express';
import { RatingController } from '../../presentation/controllers';
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
const ratingController = new RatingController();

// Периоды рейтинга для UI (текущий месяц, прошлый, квартал, год)
router.get('/periods', async (_req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);

    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 12, 0);

    const toYmd = (d: Date) => d.toISOString().split('T')[0];

    const periods = [
      {
        id: 'current',
        name: 'Текущий месяц',
        start_date: toYmd(currentMonthStart),
        end_date: toYmd(currentMonthEnd),
      },
      {
        id: 'last',
        name: 'Прошлый месяц',
        start_date: toYmd(lastMonthStart),
        end_date: toYmd(lastMonthEnd),
      },
      {
        id: 'quarter',
        name: 'Квартал',
        start_date: toYmd(quarterStart),
        end_date: toYmd(quarterEnd),
      },
      {
        id: 'year',
        name: 'Год',
        start_date: toYmd(yearStart),
        end_date: toYmd(yearEnd),
      },
    ];

    res.json(periods);
  } catch (error) {
    console.error('Error building rating periods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Применить middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Валидация companyId для всех маршрутов
router.use('/:companyId', validateUUID('companyId'));

// ========== Violation Rules ==========

// Получить все правила нарушений компании
router.get(
  '/:companyId/violation-rules',
  validateCompanyAccess,
  asyncHandler(ratingController.getViolationRules)
);

// Получить активные правила нарушений компании
router.get(
  '/:companyId/violation-rules/active',
  validateCompanyAccess,
  asyncHandler(ratingController.getActiveViolationRules)
);

// Создать новое правило нарушения
router.post(
  '/:companyId/violation-rules',
  validateCompanyAccess,
  asyncHandler(ratingController.createViolationRule)
);

// Получить правило нарушения по ID
router.get(
  '/:companyId/violation-rules/:ruleId',
  validateCompanyAccess,
  validateUUID('ruleId'),
  asyncHandler(ratingController.getViolationRuleById)
);

// Обновить правило нарушения
router.patch(
  '/:companyId/violation-rules/:ruleId',
  validateCompanyAccess,
  validateUUID('ruleId'),
  asyncHandler(ratingController.updateViolationRule)
);

// Удалить правило нарушения
router.delete(
  '/:companyId/violation-rules/:ruleId',
  validateCompanyAccess,
  validateUUID('ruleId'),
  asyncHandler(ratingController.deleteViolationRule)
);

// ========== Violations ==========

// Получить все нарушения компании
router.get(
  '/:companyId/violations',
  validateCompanyAccess,
  asyncHandler(ratingController.getViolations)
);

// Создать новое нарушение
router.post(
  '/:companyId/violations',
  validateCompanyAccess,
  asyncHandler(ratingController.createViolation)
);

// Получить нарушения сотрудника
router.get(
  '/:companyId/employees/:employeeId/violations',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(ratingController.getEmployeeViolations)
);

// Получить нарушение по ID
router.get(
  '/:companyId/violations/:violationId',
  validateCompanyAccess,
  validateUUID('violationId'),
  asyncHandler(ratingController.getViolationById)
);

// Обновить нарушение
router.patch(
  '/:companyId/violations/:violationId',
  validateCompanyAccess,
  validateUUID('violationId'),
  asyncHandler(ratingController.updateViolation)
);

// Удалить нарушение
router.delete(
  '/:companyId/violations/:violationId',
  validateCompanyAccess,
  validateUUID('violationId'),
  asyncHandler(ratingController.deleteViolation)
);

// ========== Employee Rating ==========

// Получить все рейтинги сотрудников компании
router.get(
  '/:companyId/ratings',
  validateCompanyAccess,
  asyncHandler(ratingController.getEmployeeRatings)
);

// Создать новый рейтинг сотрудника
router.post(
  '/:companyId/ratings',
  validateCompanyAccess,
  asyncHandler(ratingController.createEmployeeRating)
);

// Получить историю рейтингов сотрудника
router.get(
  '/:companyId/employees/:employeeId/ratings',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(ratingController.getEmployeeRatingHistory)
);

// Получить текущий рейтинг сотрудника
router.get(
  '/:companyId/employees/:employeeId/ratings/current',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(ratingController.getCurrentEmployeeRating)
);

// Рассчитать рейтинг сотрудника за период
router.get(
  '/:companyId/employees/:employeeId/ratings/calculate',
  validateCompanyAccess,
  validateUUID('employeeId'),
  asyncHandler(ratingController.calculateEmployeeRating)
);

// Обновить рейтинг сотрудника
router.patch(
  '/:companyId/ratings/:ratingId',
  validateCompanyAccess,
  validateUUID('ratingId'),
  asyncHandler(ratingController.updateEmployeeRating)
);

export default router;

