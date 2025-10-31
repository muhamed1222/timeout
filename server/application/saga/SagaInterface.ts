// Интерфейсы для Saga паттерна
export interface SagaStep {
  id: string;
  name: string;
  execute(context: SagaContext): Promise<SagaStepResult>;
  compensate?(context: SagaContext): Promise<SagaStepResult>;
  retryPolicy?: RetryPolicy;
}

export interface SagaStepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  nextStepId?: string;
  shouldCompensate?: boolean;
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  data: Record<string, unknown>;
  stepResults: Map<string, SagaStepResult>;
  metadata: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

export interface SagaDefinition {
  id: string;
  name: string;
  steps: SagaStep[];
  compensationSteps?: SagaStep[];
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
}

export interface SagaInstance {
  id: string;
  definitionId: string;
  correlationId: string;
  status: SagaStatus;
  currentStepId?: string;
  context: SagaContext;
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

export enum SagaStatus {
  STARTED = 'started',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
  TIMEOUT = 'timeout'
}

export interface ISagaManager {
  startSaga(definitionId: string, correlationId: string, initialData?: Record<string, unknown>): Promise<string>;
  continueSaga(sagaId: string): Promise<void>;
  compensateSaga(sagaId: string): Promise<void>;
  getSagaStatus(sagaId: string): Promise<SagaInstance | null>;
  getAllSagas(correlationId?: string): Promise<SagaInstance[]>;
  cleanupCompletedSagas(maxAge?: number): Promise<void>;
}

export interface SagaEvent {
  type: string;
  sagaId: string;
  correlationId: string;
  stepId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}



