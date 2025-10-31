// Процессор webhook для обработки входящих запросов
import { IWebhookProcessor, WebhookHandler, WebhookPayload, WebhookEvent } from './WebhookInterface';
import { TelegramWebhookValidator, TelegramWebhookData } from './TelegramWebhookValidator';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';
import { eventBus } from '../events/EventBus';

export class WebhookProcessor implements IWebhookProcessor {
  private handlers = new Map<string, WebhookHandler>();
  private failedWebhooks: WebhookEvent[] = [];
  private stats = {
    total: 0,
    processed: 0,
    failed: 0,
    pending: 0
  };

  constructor(private validator: TelegramWebhookValidator) {}

  // Регистрация обработчика webhook
  registerHandler(handler: WebhookHandler): void {
    this.handlers.set(handler.type, handler);
    console.log(`Webhook handler registered for type: ${handler.type}`);
  }

  // Обработка webhook
  async processWebhook(payload: WebhookPayload): Promise<void> {
    this.stats.total++;
    this.stats.pending++;

    try {
      // Валидация payload
      const validation = this.validator.validateWebhookData(payload.data);
      if (!validation.isValid) {
        throw new DomainException(
          `Invalid webhook data: ${validation.error}`,
          'INVALID_WEBHOOK_DATA'
        );
      }

      // Определяем тип webhook
      const webhookType = this.getWebhookType(validation.data!);
      
      // Ищем обработчик
      const handler = this.handlers.get(webhookType);
      if (!handler) {
        throw new DomainException(
          `No handler found for webhook type: ${webhookType}`,
          'HANDLER_NOT_FOUND'
        );
      }

      // Обрабатываем webhook
      await handler.handle(payload);

      // Обновляем статистику
      this.stats.processed++;
      this.stats.pending--;

      console.log(`Webhook processed successfully: ${webhookType}`);
    } catch (error) {
      this.stats.failed++;
      this.stats.pending--;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Webhook processing failed:', error);

      // Сохраняем неудачный webhook для повторной обработки
      const failedEvent: WebhookEvent = {
        id: payload.id,
        type: this.getWebhookType(payload.data as TelegramWebhookData),
        payload,
        processed: false,
        attempts: 1,
        maxAttempts: 3,
        error: errorMessage,
        createdAt: new Date()
      };

      this.failedWebhooks.push(failedEvent);

      throw error;
    }
  }

  // Повторная обработка неудачных webhook
  async retryFailedWebhooks(): Promise<void> {
    const webhooksToRetry = this.failedWebhooks.filter(
      webhook => webhook.attempts < webhook.maxAttempts
    );

    for (const webhook of webhooksToRetry) {
      try {
        webhook.attempts++;
        
        const handler = this.handlers.get(webhook.type);
        if (handler) {
          await handler.handle(webhook.payload);
          
          // Удаляем из списка неудачных
          this.failedWebhooks = this.failedWebhooks.filter(w => w.id !== webhook.id);
          webhook.processed = true;
          webhook.processedAt = new Date();
          
          console.log(`Failed webhook retried successfully: ${webhook.id}`);
        }
      } catch (error) {
        console.error(`Retry failed for webhook ${webhook.id}:`, error);
        
        if (webhook.attempts >= webhook.maxAttempts) {
          console.error(`Webhook ${webhook.id} exceeded max retry attempts`);
        }
      }
    }
  }

  // Получение статистики webhook
  async getWebhookStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }> {
    return { ...this.stats };
  }

  // Определение типа webhook
  private getWebhookType(webhookData: TelegramWebhookData): string {
    if (webhookData.message) {
      const text = webhookData.message.text;
      if (text && text.startsWith('/')) {
        const command = text.split(' ')[0].substring(1);
        return `telegram.command.${command}`;
      }
      return 'telegram.message';
    }

    if (webhookData.callback_query) {
      return 'telegram.callback_query';
    }

    return 'telegram.unknown';
  }

  // Получение списка зарегистрированных обработчиков
  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Получение неудачных webhook
  getFailedWebhooks(): WebhookEvent[] {
    return [...this.failedWebhooks];
  }

  // Очистка старых неудачных webhook
  cleanupOldFailedWebhooks(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = new Date(Date.now() - maxAge);
    
    this.failedWebhooks = this.failedWebhooks.filter(
      webhook => webhook.createdAt > cutoffTime
    );
  }

  // Публикация события webhook
  async publishWebhookEvent(webhookData: TelegramWebhookData): Promise<void> {
    try {
      const user = this.validator.extractUser(webhookData);
      const chatId = this.validator.extractChatId(webhookData);
      const updateType = this.validator.getUpdateType(webhookData);

      if (user && chatId) {
        // Публикуем событие для системы событий
        await eventBus.publish({
          type: 'telegram.webhook.received',
          data: {
            userId: user.id,
            chatId,
            updateType,
            webhookData
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error publishing webhook event:', error);
    }
  }

  // Обработка ошибок webhook
  handleWebhookError(error: Error, webhookData: TelegramWebhookData): void {
    console.error('Webhook error:', {
      error: error.message,
      stack: error.stack,
      webhookData: {
        update_id: webhookData.update_id,
        type: this.getWebhookType(webhookData)
      }
    });

    // Можно добавить отправку уведомлений администратору
    // или логирование в внешнюю систему
  }

  // Проверка состояния процессора
  isHealthy(): boolean {
    return this.handlers.size > 0;
  }

  // Получение информации о процессоре
  getInfo(): {
    handlersCount: number;
    registeredTypes: string[];
    failedWebhooksCount: number;
    isHealthy: boolean;
    } {
    return {
      handlersCount: this.handlers.size,
      registeredTypes: this.getRegisteredHandlers(),
      failedWebhooksCount: this.failedWebhooks.length,
      isHealthy: this.isHealthy()
    };
  }
}



