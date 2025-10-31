// Обработчик сообщений Telegram
import { WebhookHandler, WebhookPayload } from '../WebhookInterface';
import { TelegramWebhookData } from '../TelegramWebhookValidator';
import { DomainException } from '../../../../shared/domain/exceptions/DomainException';
import { eventBus } from '../../events/EventBus';

export class TelegramMessageHandler implements WebhookHandler {
  type = 'telegram.message';

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      const webhookData = payload.data as TelegramWebhookData;
      
      if (!webhookData.message) {
        throw new DomainException('No message in webhook data', 'INVALID_MESSAGE');
      }

      const message = webhookData.message;
      const user = {
        id: message.from.id,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        username: message.from.username,
        isBot: message.from.is_bot
      };

      const chatId = message.chat.id;
      const text = message.text || '';

      // Публикуем событие получения сообщения
      await eventBus.publish({
        type: 'telegram.message.received',
        data: {
          userId: user.id,
          chatId,
          text,
          messageId: message.message_id,
          timestamp: new Date(message.date * 1000),
          user
        },
        timestamp: new Date()
      });

      console.log(`Telegram message processed: ${user.id} -> ${text}`);
    } catch (error) {
      console.error('Error processing Telegram message:', error);
      throw error;
    }
  }
}

export class TelegramCommandHandler implements WebhookHandler {
  type = 'telegram.command';

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      const webhookData = payload.data as TelegramWebhookData;
      
      if (!webhookData.message) {
        throw new DomainException('No message in webhook data', 'INVALID_MESSAGE');
      }

      const message = webhookData.message;
      const text = message.text || '';

      if (!text.startsWith('/')) {
        throw new DomainException('Not a command', 'NOT_A_COMMAND');
      }

      const commandParts = text.split(' ');
      const command = commandParts[0].substring(1); // Убираем '/'
      const args = commandParts.slice(1);

      const user = {
        id: message.from.id,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        username: message.from.username,
        isBot: message.from.is_bot
      };

      const chatId = message.chat.id;

      // Публикуем событие получения команды
      await eventBus.publish({
        type: 'telegram.command.received',
        data: {
          userId: user.id,
          chatId,
          command,
          args,
          messageId: message.message_id,
          timestamp: new Date(message.date * 1000),
          user
        },
        timestamp: new Date()
      });

      console.log(`Telegram command processed: ${user.id} -> /${command} ${args.join(' ')}`);
    } catch (error) {
      console.error('Error processing Telegram command:', error);
      throw error;
    }
  }
}

export class TelegramCallbackQueryHandler implements WebhookHandler {
  type = 'telegram.callback_query';

  async handle(payload: WebhookPayload): Promise<void> {
    try {
      const webhookData = payload.data as TelegramWebhookData;
      
      if (!webhookData.callback_query) {
        throw new DomainException('No callback_query in webhook data', 'INVALID_CALLBACK_QUERY');
      }

      const callbackQuery = webhookData.callback_query;
      const user = {
        id: callbackQuery.from.id,
        firstName: callbackQuery.from.first_name,
        lastName: callbackQuery.from.last_name,
        username: callbackQuery.from.username,
        isBot: callbackQuery.from.is_bot
      };

      const data = callbackQuery.data || '';
      const messageId = callbackQuery.message?.message_id;
      const chatId = callbackQuery.message?.chat?.id;

      // Публикуем событие получения callback_query
      await eventBus.publish({
        type: 'telegram.callback_query.received',
        data: {
          userId: user.id,
          chatId,
          data,
          messageId,
          callbackQueryId: callbackQuery.id,
          timestamp: new Date(),
          user
        },
        timestamp: new Date()
      });

      console.log(`Telegram callback query processed: ${user.id} -> ${data}`);
    } catch (error) {
      console.error('Error processing Telegram callback query:', error);
      throw error;
    }
  }
}



