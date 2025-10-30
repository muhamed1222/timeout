import { bot } from './bot.js';
import { logger } from '../lib/logger.js';

export async function handleTelegramWebhook(update: any) {
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    logger.error('Error handling Telegram webhook', error);
    throw error;
  }
}
