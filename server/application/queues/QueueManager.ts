// Менеджер очередей для управления всеми очередями в системе
import { IQueue, QueueJob, QueueJobOptions, IQueueJobHandler } from './QueueJob';
import { MemoryQueue } from './MemoryQueue';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class QueueManager {
  private queues = new Map<string, IQueue>();
  private static instance: QueueManager;

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  // Создание очереди
  createQueue(name: string, type: 'memory' = 'memory'): IQueue {
    if (this.queues.has(name)) {
      throw new DomainException(`Queue '${name}' already exists`, 'QUEUE_EXISTS');
    }

    let queue: IQueue;
    
    switch (type) {
    case 'memory':
      queue = new MemoryQueue(name);
      break;
    default:
      throw new DomainException(`Unsupported queue type: ${type}`, 'UNSUPPORTED_QUEUE_TYPE');
    }

    this.queues.set(name, queue);
    console.log(`Queue '${name}' created with type '${type}'`);
    
    return queue;
  }

  // Получение очереди
  getQueue(name: string): IQueue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new DomainException(`Queue '${name}' not found`, 'QUEUE_NOT_FOUND');
    }
    return queue;
  }

  // Проверка существования очереди
  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  // Удаление очереди
  removeQueue(name: string): boolean {
    return this.queues.delete(name);
  }

  // Получение списка всех очередей
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  // Получение статистики всех очередей
  async getAllStats(): Promise<Record<string, {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>> {
    const stats: Record<string, any> = {};
    
    for (const [name, queue] of this.queues.entries()) {
      stats[name] = await queue.getStats();
    }
    
    return stats;
  }

  // Добавление задачи в очередь
  async addJob(queueName: string, type: string, payload: any, options?: QueueJobOptions): Promise<QueueJob> {
    const queue = this.getQueue(queueName);
    return queue.add(type, payload, options);
  }

  // Регистрация обработчика для очереди
  registerHandler(queueName: string, type: string, handler: IQueueJobHandler): void {
    const queue = this.getQueue(queueName);
    queue.process(type, handler);
  }

  // Пауза всех очередей
  async pauseAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(queue => queue.pause());
    await Promise.all(promises);
    console.log('All queues paused');
  }

  // Возобновление всех очередей
  async resumeAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(queue => queue.resume());
    await Promise.all(promises);
    console.log('All queues resumed');
  }

  // Очистка всех очередей
  async clearAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(queue => queue.clear());
    await Promise.all(promises);
    console.log('All queues cleared');
  }

  // Получение задачи из любой очереди
  async getJob(queueName: string, jobId: string): Promise<QueueJob | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  // Удаление задачи из любой очереди
  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    return queue.removeJob(jobId);
  }
}

// Singleton instance
export const queueManager = QueueManager.getInstance();



