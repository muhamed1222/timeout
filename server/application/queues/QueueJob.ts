// Базовые интерфейсы для системы очередей
import { UUID } from '../../../shared/domain/value-objects/UUID';

export interface QueueJob {
  id: UUID;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueJobOptions {
  priority?: number;
  delay?: number; // задержка в миллисекундах
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface QueueJobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retry?: boolean;
}

export interface IQueueJobHandler<T = any> {
  handle(job: QueueJob): Promise<QueueJobResult>;
}

export interface IQueue {
  name: string;
  add<T = any>(type: string, payload: T, options?: QueueJobOptions): Promise<QueueJob>;
  process<T = any>(type: string, handler: IQueueJobHandler<T>): void;
  getJob(id: string): Promise<QueueJob | null>;
  getJobs(status: 'waiting' | 'active' | 'completed' | 'failed'): Promise<QueueJob[]>;
  removeJob(id: string): Promise<boolean>;
  clear(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  isPaused(): boolean;
  getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>;
}



