import { bot } from './bot';

export async function handleTelegramWebhook(update: any) {
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    throw error;
  }
}
