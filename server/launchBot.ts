import { bot } from './telegram/bot.js';
import { logger } from './lib/logger.js';

// Only launch the bot if we're not in a serverless environment
// and if the TELEGRAM_BOT_TOKEN is provided
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'production') {
  logger.info('Launching Telegram bot');
  
  // Launch bot with error handling
  bot.launch({
    allowedUpdates: ['message', 'callback_query'],
  })
    .then(() => {
      logger.info('Telegram bot launched successfully');
    })
    .catch((error) => {
      logger.error('Failed to launch Telegram bot', {
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      // Don't crash the server if bot fails to launch
      // It will retry on next restart or can be restarted manually
    });

  // Handle uncaught errors in bot
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason as any;
    // Check if it's a Telegram bot related error
    if (error?.code === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
        error?.message?.includes('telegram') ||
        error?.message?.includes('Telegram')) {
      logger.warn('Unhandled Telegram bot error (SSL/Network)', {
        code: error?.code,
        message: error?.message,
      });
      // Don't crash on SSL/network errors
      return;
    }
    // Log other errors but don't crash
    logger.error('Unhandled rejection', { reason, error });
  });
}

// Enable graceful stop
process.once('SIGINT', () => {
  logger.info('Stopping Telegram bot (SIGINT)');
  bot.stop('SIGINT').catch((err) => {
    logger.error('Error stopping bot', err);
  });
});

process.once('SIGTERM', () => {
  logger.info('Stopping Telegram bot (SIGTERM)');
  bot.stop('SIGTERM').catch((err) => {
    logger.error('Error stopping bot', err);
  });
});