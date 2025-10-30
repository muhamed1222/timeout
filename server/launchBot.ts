import { bot } from './telegram/bot.js';
import { logger } from './lib/logger.js';

// Only launch the bot if we're not in a serverless environment
// and if the TELEGRAM_BOT_TOKEN is provided
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'production') {
  logger.info('Launching Telegram bot');
  bot.launch()
    .then(() => {
      logger.info('Telegram bot launched successfully');
    })
    .catch((error) => {
      logger.error('Failed to launch Telegram bot', error);
    });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));