import { Router } from 'express';
import { Telegraf } from 'telegraf';
import { logger } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';

const router = Router();

// Initialize bot instance (shared)
let bot: Telegraf | null = null;

/**
 * Get or create Telegram bot instance
 */
function getBot(): Telegraf {
  if (!bot) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }
    
    bot = new Telegraf(botToken);
    
    // Import and register handlers
    // This would import your bot handlers from telegramBot.ts
    // registerBotHandlers(bot);
    
    logger.info('Telegram bot instance created');
  }
  
  return bot;
}

/**
 * Webhook endpoint for Telegram updates
 * POST /api/telegram/webhook
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    logger.debug('Received Telegram webhook', {
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasCallbackQuery: !!update.callback_query,
    });
    
    // Process update with Telegraf
    const bot = getBot();
    await bot.handleUpdate(update);
    
    // Telegram expects 200 OK quickly
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error processing Telegram webhook', error);
    captureException(error as Error, {
      context: 'telegram_webhook',
      update: req.body,
    });
    
    // Still return 200 to prevent Telegram from retrying
    res.sendStatus(200);
  }
});

/**
 * Setup webhook
 * POST /api/telegram/setup-webhook
 * 
 * Call this endpoint after deployment to configure webhook
 */
router.post('/telegram/setup-webhook', async (req, res) => {
  try {
    const bot = getBot();
    const appUrl = process.env.APP_URL || process.env.VERCEL_URL;
    
    if (!appUrl) {
      return res.status(400).json({
        error: 'APP_URL or VERCEL_URL environment variable not set',
      });
    }
    
    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    
    logger.info('Setting up Telegram webhook', { webhookUrl });
    
    // Set webhook with options
    await bot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: true, // Don't process old updates
      allowed_updates: [
        'message',
        'callback_query',
        'inline_query',
      ],
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, // Optional security token
    });
    
    // Get webhook info to verify
    const info = await bot.telegram.getWebhookInfo();
    
    logger.info('Webhook configured successfully', {
      url: info.url,
      pending_updates: info.pending_update_count,
      max_connections: info.max_connections,
    });
    
    res.json({
      success: true,
      webhook: {
        url: info.url,
        pending_updates: info.pending_update_count,
        has_custom_certificate: info.has_custom_certificate,
        last_error_date: info.last_error_date,
        last_error_message: info.last_error_message,
      },
    });
  } catch (error) {
    logger.error('Failed to setup webhook', error);
    captureException(error as Error, {
      context: 'telegram_webhook_setup',
    });
    
    res.status(500).json({
      error: 'Failed to setup webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get webhook info
 * GET /api/telegram/webhook-info
 */
router.get('/telegram/webhook-info', async (req, res) => {
  try {
    const bot = getBot();
    const info = await bot.telegram.getWebhookInfo();
    
    res.json({
      url: info.url,
      has_custom_certificate: info.has_custom_certificate,
      pending_update_count: info.pending_update_count,
      ip_address: info.ip_address,
      last_error_date: info.last_error_date,
      last_error_message: info.last_error_message,
      last_synchronization_error_date: info.last_synchronization_error_date,
      max_connections: info.max_connections,
      allowed_updates: info.allowed_updates,
    });
  } catch (error) {
    logger.error('Failed to get webhook info', error);
    res.status(500).json({
      error: 'Failed to get webhook info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete webhook (switch back to polling)
 * POST /api/telegram/delete-webhook
 */
router.post('/telegram/delete-webhook', async (req, res) => {
  try {
    const bot = getBot();
    const dropPendingUpdates = req.body.drop_pending_updates ?? false;
    
    await bot.telegram.deleteWebhook({ drop_pending_updates: dropPendingUpdates });
    
    logger.info('Webhook deleted', { dropPendingUpdates });
    
    res.json({
      success: true,
      message: 'Webhook deleted. Bot is now in polling mode.',
    });
  } catch (error) {
    logger.error('Failed to delete webhook', error);
    res.status(500).json({
      error: 'Failed to delete webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test webhook (send test message to bot)
 * POST /api/telegram/test-webhook
 */
router.post('/telegram/test-webhook', async (req, res) => {
  try {
    const { chat_id } = req.body;
    
    if (!chat_id) {
      return res.status(400).json({
        error: 'chat_id is required',
      });
    }
    
    const bot = getBot();
    await bot.telegram.sendMessage(
      chat_id,
      '✅ Webhook is working! This is a test message.'
    );
    
    res.json({
      success: true,
      message: 'Test message sent',
    });
  } catch (error) {
    logger.error('Failed to send test message', error);
    res.status(500).json({
      error: 'Failed to send test message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Webhook health check
 * GET /api/telegram/webhook-health
 */
router.get('/telegram/webhook-health', async (req, res) => {
  try {
    const bot = getBot();
    const info = await bot.telegram.getWebhookInfo();
    
    // Check if webhook is properly configured
    const isHealthy = 
      !!info.url && 
      info.pending_update_count < 100 && 
      !info.last_error_message;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      url: info.url,
      pending_updates: info.pending_update_count,
      last_error: info.last_error_message,
      last_error_date: info.last_error_date,
    });
  } catch (error) {
    logger.error('Webhook health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

