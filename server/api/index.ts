// Главный роутер API

import { Router } from 'express';
import companyRoutes from './routes/company.routes';
import employeeRoutes from './routes/employee.routes';
import ratingRoutes from './routes/rating.routes';
import reportRoutes from './routes/report.routes';
import scheduleRoutes from './routes/schedule.routes';
import publicInvitesRoutes from './routes/public-invites.routes';
import { requestLogger, errorLogger } from './middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const apiRouter = Router();

// Логирование запросов
apiRouter.use(requestLogger);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Маршруты
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/companies', employeeRoutes);
apiRouter.use('/companies', ratingRoutes);
apiRouter.use('/rating', ratingRoutes);
apiRouter.use('/companies', reportRoutes);
apiRouter.use('/companies', scheduleRoutes);

// Публичные маршруты для приглашений сотрудников
apiRouter.use('/employee-invites', publicInvitesRoutes);

// Обработка ошибок
apiRouter.use(errorLogger);
apiRouter.use(errorHandler);
apiRouter.use(notFoundHandler);

export default apiRouter;
