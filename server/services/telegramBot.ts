import { logger } from '../lib/logger.js';

interface TelegramMessageOptions {
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      web_app?: { url: string };
      callback_data?: string;
    }>>;
  };
  parse_mode?: 'Markdown' | 'HTML';
}

interface TelegramApiResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

export class TelegramBotService {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(
    chatId: number,
    text: string,
    options?: TelegramMessageOptions
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options,
        }),
      });

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        logger.error('Telegram API error', undefined, { description: data.description, errorCode: data.error_code });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending Telegram message', error);
      return false;
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data: TelegramApiResponse = await response.json();
      return data.ok;
    } catch (error) {
      logger.error('Error setting webhook', error);
      return false;
    }
  }

  async getWebhookInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const data: TelegramApiResponse = await response.json();
      return data.result;
    } catch (error) {
      logger.error('Error getting webhook info', error);
      return null;
    }
  }
}

// Singleton instance
let botService: TelegramBotService | null = null;

export function getTelegramBotService(): TelegramBotService | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('TELEGRAM_BOT_TOKEN is not set in production!');
    }
    return null;
  }

  if (!botService) {
    botService = new TelegramBotService(botToken);
  }

  return botService;
}
