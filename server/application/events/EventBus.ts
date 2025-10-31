// Система обработки событий
import { BaseEvent } from '../../../shared/domain/events/BaseEvent';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export interface IEventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private handlers = new Map<string, IEventHandler<any>[]>();

  // Регистрация обработчика события
  registerHandler<T extends BaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  // Публикация события
  async publish<T extends BaseEvent>(event: T): Promise<void> {
    const eventType = event.getEventType();
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      console.warn(`No handlers registered for event: ${eventType}`);
      return;
    }

    // Выполняем все обработчики параллельно
    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
        // Не прерываем выполнение других обработчиков
      }
    });

    await Promise.allSettled(promises);
  }

  // Публикация множественных событий
  async publishAll<T extends BaseEvent>(events: T[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }

  // Получение списка зарегистрированных обработчиков
  getRegisteredHandlers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [eventType, handlers] of this.handlers.entries()) {
      result[eventType] = handlers.length;
    }
    return result;
  }

  // Проверка наличия обработчиков для события
  hasHandlers(eventType: string): boolean {
    return this.handlers.has(eventType) && this.handlers.get(eventType)!.length > 0;
  }

  // Очистка всех обработчиков
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();



