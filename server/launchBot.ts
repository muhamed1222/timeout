import { bot } from './telegram/bot.js';
import { logger } from './lib/logger.js';

// Only launch the bot if we're not in a serverless environment
// and if the TELEGRAM_BOT_TOKEN is provided
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'production') {
  logger.info('Launching Telegram bot', { 
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    nodeEnv: process.env.NODE_ENV 
  });
  
  // Launch bot with error handling
  logger.info('About to call bot.launch()');
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
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error
      });
      // Don't crash the server if bot fails to launch
      // It will retry on next restart or can be restarted manually
    });
  
  // Add timeout to check if launch succeeded
  setTimeout(() => {
    logger.info('Checking bot launch status after 2 seconds');
  }, 2000);
  
  // Also check bot info after a delay to verify it's working
  setTimeout(async () => {
    try {
      const botInfo = await bot.telegram.getMe();
      logger.info('Telegram bot verified', { 
        username: botInfo.username,
        id: botInfo.id,
        isBot: botInfo.is_bot 
      });
    } catch (error) {
      logger.error('Failed to verify Telegram bot', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, 3000);

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