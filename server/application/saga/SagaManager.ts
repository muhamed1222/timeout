// Менеджер Saga для управления сложными бизнес-процессами
import { 
  ISagaManager, 
  SagaDefinition, 
  SagaInstance, 
  SagaContext, 
  SagaStepResult, 
  SagaStatus, 
  SagaEvent,
  RetryPolicy 
} from './SagaInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { eventBus } from '../events/EventBus';

export class SagaManager implements ISagaManager {
  private definitions = new Map<string, SagaDefinition>();
  private instances = new Map<string, SagaInstance>();
  private static instance: SagaManager;

  private constructor() {}

  static getInstance(): SagaManager {
    if (!SagaManager.instance) {
      SagaManager.instance = new SagaManager();
    }
    return SagaManager.instance;
  }

  // Регистрация определения Saga
  registerDefinition(definition: SagaDefinition): void {
    this.definitions.set(definition.id, definition);
    console.log(`Saga definition registered: ${definition.id}`);
  }

  // Запуск Saga
  async startSaga(definitionId: string, correlationId: string, initialData: Record<string, unknown> = {}): Promise<string> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new DomainException(`Saga definition not found: ${definitionId}`, 'SAGA_DEFINITION_NOT_FOUND');
    }

    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: SagaContext = {
      sagaId,
      correlationId,
      data: { ...initialData },
      stepResults: new Map(),
      metadata: {}
    };

    const instance: SagaInstance = {
      id: sagaId,
      definitionId,
      correlationId,
      status: SagaStatus.STARTED,
      context,
      startedAt: new Date(),
      attempts: 0,
      maxAttempts: definition.retryPolicy?.maxAttempts || 3
    };

    this.instances.set(sagaId, instance);

    // Публикуем событие запуска Saga
    await this.publishSagaEvent({
      type: 'saga.started',
      sagaId,
      correlationId,
      data: initialData,
      timestamp: new Date()
    });

    // Запускаем выполнение
    await this.continueSaga(sagaId);

    return sagaId;
  }

  // Продолжение выполнения Saga
  async continueSaga(sagaId: string): Promise<void> {
    const instance = this.instances.get(sagaId);
    if (!instance) {
      throw new DomainException(`Saga instance not found: ${sagaId}`, 'SAGA_INSTANCE_NOT_FOUND');
    }

    const definition = this.definitions.get(instance.definitionId);
    if (!definition) {
      throw new DomainException(`Saga definition not found: ${instance.definitionId}`, 'SAGA_DEFINITION_NOT_FOUND');
    }

    try {
      instance.status = SagaStatus.RUNNING;
      instance.attempts++;

      // Определяем следующий шаг
      const nextStepId = this.getNextStepId(instance, definition);
      if (!nextStepId) {
        // Saga завершена успешно
        instance.status = SagaStatus.COMPLETED;
        instance.completedAt = new Date();

        await this.publishSagaEvent({
          type: 'saga.completed',
          sagaId,
          correlationId: instance.correlationId,
          timestamp: new Date()
        });

        return;
      }

      const step = definition.steps.find(s => s.id === nextStepId);
      if (!step) {
        throw new DomainException(`Saga step not found: ${nextStepId}`, 'SAGA_STEP_NOT_FOUND');
      }

      instance.currentStepId = nextStepId;

      // Выполняем шаг
      const result = await this.executeStep(step, instance.context);
      
      // Сохраняем результат
      instance.context.stepResults.set(nextStepId, result);

      if (result.success) {
        // Шаг выполнен успешно, продолжаем
        await this.publishSagaEvent({
          type: 'saga.step.completed',
          sagaId,
          correlationId: instance.correlationId,
          stepId: nextStepId,
          data: result.data,
          timestamp: new Date()
        });

        // Продолжаем выполнение
        await this.continueSaga(sagaId);
      } else {
        // Шаг не удался
        if (result.shouldCompensate) {
          await this.compensateSaga(sagaId);
        } else {
          // Повторяем попытку
          await this.retrySaga(sagaId);
        }
      }
    } catch (error) {
      console.error(`Saga execution error: ${sagaId}`, error);
      
      instance.status = SagaStatus.FAILED;
      instance.failedAt = new Date();
      instance.error = error instanceof Error ? error.message : 'Unknown error';

      await this.publishSagaEvent({
        type: 'saga.failed',
        sagaId,
        correlationId: instance.correlationId,
        data: { error: instance.error },
        timestamp: new Date()
      });
    }
  }

  // Компенсация Saga
  async compensateSaga(sagaId: string): Promise<void> {
    const instance = this.instances.get(sagaId);
    if (!instance) {
      throw new DomainException(`Saga instance not found: ${sagaId}`, 'SAGA_INSTANCE_NOT_FOUND');
    }

    const definition = this.definitions.get(instance.definitionId);
    if (!definition) {
      throw new DomainException(`Saga definition not found: ${instance.definitionId}`, 'SAGA_DEFINITION_NOT_FOUND');
    }

    try {
      instance.status = SagaStatus.COMPENSATING;

      await this.publishSagaEvent({
        type: 'saga.compensating',
        sagaId,
        correlationId: instance.correlationId,
        timestamp: new Date()
      });

      // Выполняем компенсационные шаги в обратном порядке
      const completedSteps = Array.from(instance.context.stepResults.keys()).reverse();
      
      for (const stepId of completedSteps) {
        const step = definition.steps.find(s => s.id === stepId);
        if (step && step.compensate) {
          try {
            const result = await step.compensate(instance.context);
            console.log(`Compensation step completed: ${stepId}`, result);
          } catch (error) {
            console.error(`Compensation step failed: ${stepId}`, error);
            // Продолжаем компенсацию даже при ошибках
          }
        }
      }

      instance.status = SagaStatus.COMPENSATED;

      await this.publishSagaEvent({
        type: 'saga.compensated',
        sagaId,
        correlationId: instance.correlationId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Saga compensation error: ${sagaId}`, error);
      instance.status = SagaStatus.FAILED;
      instance.error = error instanceof Error ? error.message : 'Compensation failed';
    }
  }

  // Повторная попытка Saga
  private async retrySaga(sagaId: string): Promise<void> {
    const instance = this.instances.get(sagaId);
    if (!instance) {
      return;
    }

    const definition = this.definitions.get(instance.definitionId);
    if (!definition) {
      return;
    }

    if (instance.attempts >= instance.maxAttempts) {
      // Превышено максимальное количество попыток
      instance.status = SagaStatus.FAILED;
      instance.failedAt = new Date();
      instance.error = 'Max retry attempts exceeded';

      await this.publishSagaEvent({
        type: 'saga.failed',
        sagaId,
        correlationId: instance.correlationId,
        data: { error: instance.error },
        timestamp: new Date()
      });

      return;
    }

    // Задержка перед повторной попыткой
    const delay = this.calculateRetryDelay(instance, definition.retryPolicy);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Продолжаем выполнение
    await this.continueSaga(sagaId);
  }

  // Выполнение шага Saga
  private async executeStep(step: any, context: SagaContext): Promise<SagaStepResult> {
    try {
      console.log(`Executing saga step: ${step.id}`);
      const result = await step.execute(context);
      console.log(`Saga step completed: ${step.id}`, result);
      return result;
    } catch (error) {
      console.error(`Saga step failed: ${step.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldCompensate: true
      };
    }
  }

  // Определение следующего шага
  private getNextStepId(instance: SagaInstance, definition: SagaDefinition): string | null {
    const completedSteps = Array.from(instance.context.stepResults.keys());
    
    // Ищем первый невыполненный шаг
    for (const step of definition.steps) {
      if (!completedSteps.includes(step.id)) {
        return step.id;
      }
    }

    return null;
  }

  // Расчет задержки для повторной попытки
  private calculateRetryDelay(instance: SagaInstance, retryPolicy?: RetryPolicy): number {
    if (!retryPolicy) {
      return 1000; // 1 секунда по умолчанию
    }

    let delay = retryPolicy.delayMs;
    
    if (retryPolicy.backoffMultiplier && instance.attempts > 1) {
      delay *= Math.pow(retryPolicy.backoffMultiplier, instance.attempts - 1);
    }

    if (retryPolicy.maxDelayMs && delay > retryPolicy.maxDelayMs) {
      delay = retryPolicy.maxDelayMs;
    }

    return delay;
  }

  // Публикация события Saga
  private async publishSagaEvent(event: SagaEvent): Promise<void> {
    try {
      await eventBus.publish({
        type: event.type,
        data: {
          sagaId: event.sagaId,
          correlationId: event.correlationId,
          stepId: event.stepId,
          ...event.data
        },
        timestamp: event.timestamp
      });
    } catch (error) {
      console.error('Error publishing saga event:', error);
    }
  }

  // Получение статуса Saga
  async getSagaStatus(sagaId: string): Promise<SagaInstance | null> {
    return this.instances.get(sagaId) || null;
  }

  // Получение всех Saga по correlationId
  async getAllSagas(correlationId?: string): Promise<SagaInstance[]> {
    const allSagas = Array.from(this.instances.values());
    
    if (correlationId) {
      return allSagas.filter(saga => saga.correlationId === correlationId);
    }
    
    return allSagas;
  }

  // Очистка завершенных Saga
  async cleanupCompletedSagas(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAge);
    
    for (const [sagaId, instance] of this.instances.entries()) {
      if (
        (instance.status === SagaStatus.COMPLETED || 
         instance.status === SagaStatus.COMPENSATED ||
         instance.status === SagaStatus.FAILED) &&
        (instance.completedAt || instance.failedAt) &&
        (instance.completedAt || instance.failedAt)! < cutoffTime
      ) {
        this.instances.delete(sagaId);
        console.log(`Cleaned up old saga: ${sagaId}`);
      }
    }
  }

  // Получение статистики Saga
  getStats(): {
    totalDefinitions: number;
    totalInstances: number;
    instancesByStatus: Record<SagaStatus, number>;
    } {
    const instancesByStatus: Record<SagaStatus, number> = {
      [SagaStatus.STARTED]: 0,
      [SagaStatus.RUNNING]: 0,
      [SagaStatus.COMPLETED]: 0,
      [SagaStatus.FAILED]: 0,
      [SagaStatus.COMPENSATING]: 0,
      [SagaStatus.COMPENSATED]: 0,
      [SagaStatus.TIMEOUT]: 0
    };

    for (const instance of this.instances.values()) {
      instancesByStatus[instance.status]++;
    }

    return {
      totalDefinitions: this.definitions.size,
      totalInstances: this.instances.size,
      instancesByStatus
    };
  }
}

// Singleton instance
export const sagaManager = SagaManager.getInstance();



