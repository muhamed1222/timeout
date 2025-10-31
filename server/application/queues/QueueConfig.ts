// Конфигурация системы очередей
import { queueManager } from './QueueManager';
import { scheduler } from './Scheduler';
import { ShiftMonitoringHandler } from './handlers/ShiftMonitoringHandler';
import { NotificationHandler } from './handlers/NotificationHandler';
import { ShiftApplicationService } from '../services/ShiftApplicationService';
import { EmployeeApplicationService } from '../services/EmployeeApplicationService';

export class QueueConfig {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Создаем очереди
    const shiftMonitoringQueue = queueManager.createQueue('shift-monitoring', 'memory');
    const notificationQueue = queueManager.createQueue('notifications', 'memory');
    const reportQueue = queueManager.createQueue('reports', 'memory');

    // Создаем сервисы
    const shiftService = new ShiftApplicationService();
    const employeeService = new EmployeeApplicationService();

    // Создаем обработчики
    const shiftMonitoringHandler = new ShiftMonitoringHandler(shiftService, employeeService);
    const notificationHandler = new NotificationHandler(employeeService);

    // Регистрируем обработчики для мониторинга смен
    queueManager.registerHandler('shift-monitoring', 'MONITOR_LATE_STARTS', shiftMonitoringHandler);
    queueManager.registerHandler('shift-monitoring', 'MONITOR_EARLY_ENDS', shiftMonitoringHandler);
    queueManager.registerHandler('shift-monitoring', 'MONITOR_MISSED_SHIFTS', shiftMonitoringHandler);
    queueManager.registerHandler('shift-monitoring', 'MONITOR_ACTIVE_SHIFTS', shiftMonitoringHandler);
    queueManager.registerHandler('shift-monitoring', 'CHECK_SPECIFIC_SHIFT', shiftMonitoringHandler);

    // Регистрируем обработчики для уведомлений
    queueManager.registerHandler('notifications', 'SEND_SHIFT_REMINDER', notificationHandler);
    queueManager.registerHandler('notifications', 'SEND_VIOLATION_NOTIFICATION', notificationHandler);
    queueManager.registerHandler('notifications', 'SEND_WEEKLY_REPORT', notificationHandler);
    queueManager.registerHandler('notifications', 'SEND_EMPLOYEE_WELCOME', notificationHandler);

    // Настраиваем запланированные задачи
    this.setupScheduledTasks();

    this.initialized = true;
    console.log('Queue system initialized with queues:', queueManager.getQueueNames());
  }

  private static setupScheduledTasks(): void {
    // Мониторинг опозданий - каждые 5 минут
    scheduler.addTask({
      id: 'monitor-late-starts',
      name: 'Monitor Late Starts',
      queueName: 'shift-monitoring',
      jobType: 'MONITOR_LATE_STARTS',
      payload: {},
      schedule: '*/5 * * * *', // каждые 5 минут
      enabled: true
    });

    // Мониторинг ранних завершений - каждые 10 минут
    scheduler.addTask({
      id: 'monitor-early-ends',
      name: 'Monitor Early Ends',
      queueName: 'shift-monitoring',
      jobType: 'MONITOR_EARLY_ENDS',
      payload: {},
      schedule: '*/10 * * * *', // каждые 10 минут
      enabled: true
    });

    // Мониторинг пропущенных смен - каждые 15 минут
    scheduler.addTask({
      id: 'monitor-missed-shifts',
      name: 'Monitor Missed Shifts',
      queueName: 'shift-monitoring',
      jobType: 'MONITOR_MISSED_SHIFTS',
      payload: {},
      schedule: '*/15 * * * *', // каждые 15 минут
      enabled: true
    });

    // Мониторинг активных смен - каждые 30 минут
    scheduler.addTask({
      id: 'monitor-active-shifts',
      name: 'Monitor Active Shifts',
      queueName: 'shift-monitoring',
      jobType: 'MONITOR_ACTIVE_SHIFTS',
      payload: {},
      schedule: '*/30 * * * *', // каждые 30 минут
      enabled: true
    });

    // Еженедельный отчет - каждый понедельник в 9:00
    scheduler.addTask({
      id: 'weekly-report',
      name: 'Weekly Report',
      queueName: 'notifications',
      jobType: 'SEND_WEEKLY_REPORT',
      payload: {},
      schedule: '0 9 * * 1', // каждый понедельник в 9:00
      enabled: true
    });

    // Запускаем все задачи
    scheduler.startAll();
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getQueueStats(): Promise<Record<string, any>> {
    return queueManager.getAllStats();
  }

  static getScheduledTasks(): any[] {
    return scheduler.getAllTasks();
  }

  // Методы для управления задачами
  static async addMonitoringJob(companyId: string, jobType: string, payload: any = {}): Promise<void> {
    await queueManager.addJob('shift-monitoring', jobType, { companyId, ...payload });
  }

  static async addNotificationJob(jobType: string, payload: any): Promise<void> {
    await queueManager.addJob('notifications', jobType, payload);
  }

  static async addReportJob(jobType: string, payload: any): Promise<void> {
    await queueManager.addJob('reports', jobType, payload);
  }

  // Методы для управления планировщиком
  static enableTask(taskId: string): void {
    scheduler.enableTask(taskId);
  }

  static disableTask(taskId: string): void {
    scheduler.disableTask(taskId);
  }

  static async runTask(taskId: string): Promise<void> {
    await scheduler.runTask(taskId);
  }

  static stopAllTasks(): void {
    scheduler.stopAll();
  }

  static startAllTasks(): void {
    scheduler.startAll();
  }
}

// Константы для типов задач
export const JOB_TYPES = {
  // Мониторинг смен
  MONITOR_LATE_STARTS: 'MONITOR_LATE_STARTS',
  MONITOR_EARLY_ENDS: 'MONITOR_EARLY_ENDS',
  MONITOR_MISSED_SHIFTS: 'MONITOR_MISSED_SHIFTS',
  MONITOR_ACTIVE_SHIFTS: 'MONITOR_ACTIVE_SHIFTS',
  CHECK_SPECIFIC_SHIFT: 'CHECK_SPECIFIC_SHIFT',
  
  // Уведомления
  SEND_SHIFT_REMINDER: 'SEND_SHIFT_REMINDER',
  SEND_VIOLATION_NOTIFICATION: 'SEND_VIOLATION_NOTIFICATION',
  SEND_WEEKLY_REPORT: 'SEND_WEEKLY_REPORT',
  SEND_EMPLOYEE_WELCOME: 'SEND_EMPLOYEE_WELCOME',
} as const;

export const QUEUE_NAMES = {
  SHIFT_MONITORING: 'shift-monitoring',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
} as const;



