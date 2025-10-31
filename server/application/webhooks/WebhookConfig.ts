// Конфигурация системы webhook
import { WebhookProcessor } from './WebhookProcessor';
import { TelegramWebhookValidator } from './TelegramWebhookValidator';
import { TelegramMessageHandler, TelegramCommandHandler, TelegramCallbackQueryHandler } from './handlers/TelegramMessageHandler';

export class WebhookConfig {
  private static processor: WebhookProcessor | null = null;
  private static initialized = false;

  static initialize(botToken: string): void {
    if (this.initialized) {
      return;
    }

    // Создаем валидатор
    const validator = new TelegramWebhookValidator(botToken);

    // Создаем процессор
    this.processor = new WebhookProcessor(validator);

    // Регистрируем обработчики
    this.registerHandlers();

    this.initialized = true;
    console.log('Webhook system initialized');
  }

  private static registerHandlers(): void {
    if (!this.processor) {
      throw new Error('Webhook processor not initialized');
    }

    // Регистрируем обработчики Telegram
    this.processor.registerHandler(new TelegramMessageHandler());
    this.processor.registerHandler(new TelegramCommandHandler());
    this.processor.registerHandler(new TelegramCallbackQueryHandler());

    console.log('Webhook handlers registered');
  }

  static getProcessor(): WebhookProcessor {
    if (!this.processor) {
      throw new Error('Webhook system not initialized');
    }
    return this.processor;
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  // Обработка входящего webhook
  static async processWebhook(payload: any, signature?: string): Promise<void> {
    const processor = this.getProcessor();

    // Создаем payload для процессора
    const webhookPayload = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'telegram',
      data: payload,
      timestamp: new Date(),
      source: 'telegram',
      signature,
      headers: {}
    };

    await processor.processWebhook(webhookPayload);
  }

  // Получение статистики webhook
  static async getStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }> {
    const processor = this.getProcessor();
    return processor.getWebhookStats();
  }

  // Повторная обработка неудачных webhook
  static async retryFailedWebhooks(): Promise<void> {
    const processor = this.getProcessor();
    await processor.retryFailedWebhooks();
  }

  // Получение информации о системе
  static getInfo(): {
    initialized: boolean;
    handlersCount: number;
    registeredTypes: string[];
    failedWebhooksCount: number;
    isHealthy: boolean;
    } {
    if (!this.processor) {
      return {
        initialized: false,
        handlersCount: 0,
        registeredTypes: [],
        failedWebhooksCount: 0,
        isHealthy: false
      };
    }

    const info = this.processor.getInfo();
    return {
      initialized: this.initialized,
      ...info
    };
  }

  // Очистка старых неудачных webhook
  static cleanupOldFailedWebhooks(maxAge?: number): void {
    const processor = this.getProcessor();
    processor.cleanupOldFailedWebhooks(maxAge);
  }

  // Проверка состояния системы
  static isHealthy(): boolean {
    if (!this.processor) {
      return false;
    }
    return this.processor.isHealthy();
  }
}



