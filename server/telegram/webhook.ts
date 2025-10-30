import { bot } from './bot';
import { logger } from '../lib/logger';

export async function handleTelegramWebhook(update: any) {
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    logger.error('Error handling Telegram webhook', error);
    throw error;
  }
}
