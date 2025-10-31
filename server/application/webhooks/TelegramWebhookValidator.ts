// Валидатор для Telegram webhook
import crypto from 'crypto';
import { TelegramWebhookData, WebhookValidationResult } from './WebhookInterface';
import { DomainException } from '../../../shared/domain/exceptions/DomainException';

export class TelegramWebhookValidator {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  // Валидация подписи Telegram webhook
  validateSignature(payload: string, signature: string): boolean {
    try {
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Error validating Telegram signature:', error);
      return false;
    }
  }

  // Валидация структуры данных Telegram webhook
  validateWebhookData(data: unknown): WebhookValidationResult {
    try {
      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          error: 'Invalid webhook data structure'
        };
      }

      const webhookData = data as TelegramWebhookData;

      // Проверяем обязательные поля
      if (!webhookData.update_id || typeof webhookData.update_id !== 'number') {
        return {
          isValid: false,
          error: 'Missing or invalid update_id'
        };
      }

      // Проверяем наличие сообщения или callback_query
      if (!webhookData.message && !webhookData.callback_query) {
        return {
          isValid: false,
          error: 'Missing message or callback_query'
        };
      }

      // Валидация сообщения
      if (webhookData.message) {
        const messageValidation = this.validateMessage(webhookData.message);
        if (!messageValidation.isValid) {
          return messageValidation;
        }
      }

      // Валидация callback_query
      if (webhookData.callback_query) {
        const callbackValidation = this.validateCallbackQuery(webhookData.callback_query);
        if (!callbackValidation.isValid) {
          return callbackValidation;
        }
      }

      return {
        isValid: true,
        data: webhookData
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Валидация сообщения
  private validateMessage(message: any): WebhookValidationResult {
    if (!message.message_id || typeof message.message_id !== 'number') {
      return {
        isValid: false,
        error: 'Invalid message_id'
      };
    }

    if (!message.from || typeof message.from !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message.from'
      };
    }

    if (!message.from.id || typeof message.from.id !== 'number') {
      return {
        isValid: false,
        error: 'Invalid message.from.id'
      };
    }

    if (!message.chat || typeof message.chat !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message.chat'
      };
    }

    if (!message.chat.id || typeof message.chat.id !== 'number') {
      return {
        isValid: false,
        error: 'Invalid message.chat.id'
      };
    }

    if (!message.date || typeof message.date !== 'number') {
      return {
        isValid: false,
        error: 'Invalid message.date'
      };
    }

    return {
      isValid: true
    };
  }

  // Валидация callback_query
  private validateCallbackQuery(callbackQuery: any): WebhookValidationResult {
    if (!callbackQuery.id || typeof callbackQuery.id !== 'string') {
      return {
        isValid: false,
        error: 'Invalid callback_query.id'
      };
    }

    if (!callbackQuery.from || typeof callbackQuery.from !== 'object') {
      return {
        isValid: false,
        error: 'Invalid callback_query.from'
      };
    }

    if (!callbackQuery.from.id || typeof callbackQuery.from.id !== 'number') {
      return {
        isValid: false,
        error: 'Invalid callback_query.from.id'
      };
    }

    return {
      isValid: true
    };
  }

  // Извлечение пользователя из webhook данных
  extractUser(webhookData: TelegramWebhookData): {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    isBot: boolean;
  } | null {
    try {
      if (webhookData.message?.from) {
        return {
          id: webhookData.message.from.id,
          firstName: webhookData.message.from.first_name,
          lastName: webhookData.message.from.last_name,
          username: webhookData.message.from.username,
          isBot: webhookData.message.from.is_bot
        };
      }

      if (webhookData.callback_query?.from) {
        return {
          id: webhookData.callback_query.from.id,
          firstName: webhookData.callback_query.from.first_name,
          lastName: webhookData.callback_query.from.last_name,
          username: webhookData.callback_query.from.username,
          isBot: webhookData.callback_query.from.is_bot
        };
      }

      return null;
    } catch (error) {
      console.error('Error extracting user from webhook:', error);
      return null;
    }
  }

  // Извлечение текста сообщения
  extractMessageText(webhookData: TelegramWebhookData): string | null {
    if (webhookData.message?.text) {
      return webhookData.message.text;
    }
    return null;
  }

  // Извлечение данных callback_query
  extractCallbackData(webhookData: TelegramWebhookData): string | null {
    if (webhookData.callback_query?.data) {
      return webhookData.callback_query.data;
    }
    return null;
  }

  // Извлечение chat ID
  extractChatId(webhookData: TelegramWebhookData): number | null {
    if (webhookData.message?.chat?.id) {
      return webhookData.message.chat.id;
    }
    if (webhookData.callback_query?.message?.chat?.id) {
      return webhookData.callback_query.message.chat.id;
    }
    return null;
  }

  // Проверка типа обновления
  getUpdateType(webhookData: TelegramWebhookData): 'message' | 'callback_query' | 'unknown' {
    if (webhookData.message) {
      return 'message';
    }
    if (webhookData.callback_query) {
      return 'callback_query';
    }
    return 'unknown';
  }

  // Проверка команды в сообщении
  isCommand(text: string): boolean {
    return text.startsWith('/');
  }

  // Извлечение команды из текста
  extractCommand(text: string): { command: string; args: string[] } | null {
    if (!this.isCommand(text)) {
      return null;
    }

    const parts = text.split(' ');
    const command = parts[0].substring(1); // Убираем '/'
    const args = parts.slice(1);

    return {
      command,
      args
    };
  }
}



