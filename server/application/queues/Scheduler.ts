// Планировщик задач для автоматического запуска мониторинга и уведомлений
import { queueManager } from './QueueManager';
import { QueueJobOptions } from './QueueJob';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export interface ScheduledTask {
  id: string;
  name: string;
  queueName: string;
  jobType: string;
  payload: Record<string, unknown>;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class Scheduler {
  private tasks = new Map<string, ScheduledTask>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private static instance: Scheduler;

  private constructor() {}

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  // Добавление задачи в расписание
  addTask(task: ScheduledTask): void {
    if (this.tasks.has(task.id)) {
      throw new DomainException(`Task '${task.id}' already exists`, 'TASK_EXISTS');
    }

    this.tasks.set(task.id, task);
    
    if (task.enabled) {
      this.scheduleTask(task);
    }

    console.log(`Task '${task.name}' added to scheduler`);
  }

  // Удаление задачи из расписания
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Останавливаем интервал
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }

    this.tasks.delete(taskId);
    console.log(`Task '${task.name}' removed from scheduler`);
    
    return true;
  }

  // Включение задачи
  enableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new DomainException(`Task '${taskId}' not found`, 'TASK_NOT_FOUND');
    }

    task.enabled = true;
    this.scheduleTask(task);
    console.log(`Task '${task.name}' enabled`);
  }

  // Отключение задачи
  disableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new DomainException(`Task '${taskId}' not found`, 'TASK_NOT_FOUND');
    }

    task.enabled = false;
    
    // Останавливаем интервал
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }

    console.log(`Task '${task.name}' disabled`);
  }

  // Получение всех задач
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  // Получение задачи по ID
  getTask(taskId: string): ScheduledTask | null {
    return this.tasks.get(taskId) || null;
  }

  // Запуск задачи вручную
  async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new DomainException(`Task '${taskId}' not found`, 'TASK_NOT_FOUND');
    }

    await this.executeTask(task);
  }

  // Остановка всех задач
  stopAll(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    console.log('All scheduled tasks stopped');
  }

  // Запуск всех задач
  startAll(): void {
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
    console.log('All enabled tasks started');
  }

  // Планирование задачи
  private scheduleTask(task: ScheduledTask): void {
    // Останавливаем существующий интервал
    const existingInterval = this.intervals.get(task.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Парсим cron выражение (упрощенная версия)
    const interval = this.parseCronExpression(task.schedule);
    
    const timeout = setInterval(async () => {
      try {
        await this.executeTask(task);
      } catch (error) {
        console.error(`Error executing task '${task.name}':`, error);
      }
    }, interval);

    this.intervals.set(task.id, timeout);
    
    // Обновляем время следующего запуска
    task.nextRun = new Date(Date.now() + interval);
  }

  // Выполнение задачи
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`Executing scheduled task: ${task.name}`);
      
      const options: QueueJobOptions = {
        priority: 1,
        attempts: 1
      };

      await queueManager.addJob(task.queueName, task.jobType, task.payload, options);
      
      // Обновляем время последнего запуска
      task.lastRun = new Date();
      
      console.log(`Task '${task.name}' executed successfully`);
    } catch (error) {
      console.error(`Failed to execute task '${task.name}':`, error);
    }
  }

  // Парсинг cron выражения (упрощенная версия)
  private parseCronExpression(cron: string): number {
    // Поддерживаем только простые форматы:
    // "*/5 * * * *" - каждые 5 минут
    // "0 */1 * * *" - каждый час
    // "0 0 * * *" - каждый день в полночь
    
    const parts = cron.split(' ');
    if (parts.length !== 5) {
      throw new DomainException(`Invalid cron expression: ${cron}`, 'INVALID_CRON');
    }

    const [minute, hour, day, month, weekday] = parts;

    // Каждые N минут
    if (minute.startsWith('*/')) {
      const minutes = parseInt(minute.substring(2));
      return minutes * 60 * 1000;
    }

    // Каждый час
    if (minute === '0' && hour.startsWith('*/')) {
      const hours = parseInt(hour.substring(2));
      return hours * 60 * 60 * 1000;
    }

    // Каждый день в полночь
    if (minute === '0' && hour === '0') {
      return 24 * 60 * 60 * 1000;
    }

    // По умолчанию - каждые 5 минут
    return 5 * 60 * 1000;
  }
}

// Singleton instance
export const scheduler = Scheduler.getInstance();



