// Контроллер для управления очередями
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../../../shared/types';
import { QueueConfig, JOB_TYPES, QUEUE_NAMES } from '../../application/queues/QueueConfig';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class QueueController {
  // Получение статистики очередей
  getQueueStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await QueueConfig.getQueueStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка получения статистики очередей');
    }
  };

  // Получение запланированных задач
  getScheduledTasks = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = QueueConfig.getScheduledTasks();
      
      const response: ApiResponse = {
        success: true,
        data: tasks,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка получения запланированных задач');
    }
  };

  // Запуск задачи мониторинга
  runMonitoringJob = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const { jobType } = req.body;

      if (!Object.values(JOB_TYPES).includes(jobType)) {
        throw new DomainException(`Invalid job type: ${jobType}`, 'INVALID_JOB_TYPE');
      }

      await QueueConfig.addMonitoringJob(companyId, jobType, req.body.payload || {});
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Monitoring job added to queue' },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка запуска задачи мониторинга');
    }
  };

  // Отправка уведомления
  sendNotification = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobType, payload } = req.body;

      if (!Object.values(JOB_TYPES).includes(jobType)) {
        throw new DomainException(`Invalid job type: ${jobType}`, 'INVALID_JOB_TYPE');
      }

      await QueueConfig.addNotificationJob(jobType, payload);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Notification job added to queue' },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка отправки уведомления');
    }
  };

  // Включение запланированной задачи
  enableTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;

      QueueConfig.enableTask(taskId);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Task enabled' },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка включения задачи');
    }
  };

  // Отключение запланированной задачи
  disableTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;

      QueueConfig.disableTask(taskId);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Task disabled' },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка отключения задачи');
    }
  };

  // Запуск задачи вручную
  runTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;

      await QueueConfig.runTask(taskId);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Task executed' },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка выполнения задачи');
    }
  };

  // Получение доступных типов задач
  getJobTypes = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jobTypes = {
        monitoring: [
          JOB_TYPES.MONITOR_LATE_STARTS,
          JOB_TYPES.MONITOR_EARLY_ENDS,
          JOB_TYPES.MONITOR_MISSED_SHIFTS,
          JOB_TYPES.MONITOR_ACTIVE_SHIFTS,
          JOB_TYPES.CHECK_SPECIFIC_SHIFT,
        ],
        notifications: [
          JOB_TYPES.SEND_SHIFT_REMINDER,
          JOB_TYPES.SEND_VIOLATION_NOTIFICATION,
          JOB_TYPES.SEND_WEEKLY_REPORT,
          JOB_TYPES.SEND_EMPLOYEE_WELCOME,
        ]
      };
      
      const response: ApiResponse = {
        success: true,
        data: jobTypes,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Ошибка получения типов задач');
    }
  };

  // Унифицированная обработка ошибок
  private handleError(error: any, res: Response, defaultMessage: string): void {
    console.error('Queue controller error:', error);

    if (error instanceof DomainException) {
      const statusCode = this.getStatusCodeForDomainException(error);
      res.status(statusCode).json({
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: defaultMessage,
      });
    }
  }

  // Определение HTTP статус кода для доменных исключений
  private getStatusCodeForDomainException(error: DomainException): number {
    switch (error.code) {
    case 'TASK_NOT_FOUND':
    case 'QUEUE_NOT_FOUND':
      return 404;
    case 'TASK_EXISTS':
    case 'QUEUE_EXISTS':
      return 409;
    case 'INVALID_JOB_TYPE':
    case 'INVALID_CRON':
      return 400;
    case 'QUEUE_PAUSED':
      return 423;
    default:
      return 500;
    }
  }
}



