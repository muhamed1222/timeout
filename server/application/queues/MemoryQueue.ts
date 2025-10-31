// Очередь в памяти для разработки и тестирования
import { IQueue, QueueJob, QueueJobOptions, QueueJobResult, IQueueJobHandler } from './QueueJob';
import { UUID } from '../../../shared/domain/value-objects/UUID';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class MemoryQueue implements IQueue {
  public name: string;
  private jobs = new Map<string, QueueJob>();
  private handlers = new Map<string, IQueueJobHandler>();
  private paused = false;
  private processing = false;

  constructor(name: string) {
    this.name = name;
  }

  async add<T = any>(type: string, payload: T, options: QueueJobOptions = {}): Promise<QueueJob> {
    if (this.paused) {
      throw new DomainException('Queue is paused', 'QUEUE_PAUSED');
    }

    const now = new Date();
    const scheduledAt = options.delay ? new Date(now.getTime() + options.delay) : now;

    const job: QueueJob = {
      id: UUID.generate(),
      type,
      payload: payload as Record<string, unknown>,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      createdAt: now,
      scheduledAt,
      metadata: options
    };

    this.jobs.set(job.id.toString(), job);

    // Если задача не отложена, сразу запускаем обработку
    if (!options.delay) {
      setImmediate(() => this.processNext());
    } else {
      // Для отложенных задач используем setTimeout
      setTimeout(() => this.processNext(), options.delay);
    }

    return job;
  }

  process<T = any>(type: string, handler: IQueueJobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  async getJob(id: string): Promise<QueueJob | null> {
    return this.jobs.get(id) || null;
  }

  async getJobs(status: 'waiting' | 'active' | 'completed' | 'failed'): Promise<QueueJob[]> {
    const jobs = Array.from(this.jobs.values());
    
    switch (status) {
    case 'waiting':
      return jobs.filter(job => !job.processedAt && !job.failedAt);
    case 'active':
      return jobs.filter(job => job.processedAt && !job.failedAt);
    case 'completed':
      return jobs.filter(job => job.processedAt && !job.failedAt);
    case 'failed':
      return jobs.filter(job => job.failedAt);
    default:
      return jobs;
    }
  }

  async removeJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async clear(): Promise<void> {
    this.jobs.clear();
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
    // Запускаем обработку ожидающих задач
    setImmediate(() => this.processNext());
  }

  isPaused(): boolean {
    return this.paused;
  }

  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    
    return {
      waiting: jobs.filter(job => !job.processedAt && !job.failedAt).length,
      active: jobs.filter(job => job.processedAt && !job.failedAt).length,
      completed: jobs.filter(job => job.processedAt && !job.failedAt).length,
      failed: jobs.filter(job => job.failedAt).length
    };
  }

  private async processNext(): Promise<void> {
    if (this.paused || this.processing) {
      return;
    }

    this.processing = true;

    try {
      // Находим следующую задачу для обработки
      const waitingJobs = await this.getJobs('waiting');
      const readyJobs = waitingJobs.filter(job => 
        !job.scheduledAt || job.scheduledAt <= new Date()
      );

      if (readyJobs.length === 0) {
        this.processing = false;
        return;
      }

      // Сортируем по приоритету (высший приоритет = большее число)
      readyJobs.sort((a, b) => b.priority - a.priority);

      const job = readyJobs[0];
      const handler = this.handlers.get(job.type);

      if (!handler) {
        console.warn(`No handler found for job type: ${job.type}`);
        this.processing = false;
        return;
      }

      // Обновляем статус задачи
      job.attempts++;
      job.processedAt = new Date();

      try {
        const result = await handler.handle(job);
        
        if (result.success) {
          // Задача выполнена успешно
          console.log(`Job ${job.id.toString()} completed successfully`);
        } else if (result.retry && job.attempts < job.maxAttempts) {
          // Повторная попытка
          job.processedAt = undefined;
          job.attempts--;
          
          const delay = this.calculateBackoffDelay(job);
          setTimeout(() => this.processNext(), delay);
        } else {
          // Задача провалена окончательно
          job.failedAt = new Date();
          job.error = result.error || 'Unknown error';
          console.error(`Job ${job.id.toString()} failed:`, job.error);
        }
      } catch (error) {
        // Обработка ошибок
        if (job.attempts < job.maxAttempts) {
          job.processedAt = undefined;
          job.attempts--;
          
          const delay = this.calculateBackoffDelay(job);
          setTimeout(() => this.processNext(), delay);
        } else {
          job.failedAt = new Date();
          job.error = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Job ${job.id.toString()} failed after ${job.maxAttempts} attempts:`, job.error);
        }
      }
    } finally {
      this.processing = false;
      
      // Проверяем, есть ли еще задачи для обработки
      setImmediate(() => this.processNext());
    }
  }

  private calculateBackoffDelay(job: QueueJob): number {
    const metadata = job.metadata as any;
    const backoff = metadata?.backoff;
    
    if (!backoff) {
      return 1000; // 1 секунда по умолчанию
    }

    if (backoff.type === 'exponential') {
      return Math.min(backoff.delay * Math.pow(2, job.attempts), 30000); // максимум 30 секунд
    }

    return backoff.delay;
  }
}



