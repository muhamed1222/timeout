import { bot } from './telegram/bot';

// Only launch the bot if we're not in a serverless environment
// and if the TELEGRAM_BOT_TOKEN is provided
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'production') {
  console.log('Launching Telegram bot...');
  bot.launch()
    .then(() => {
      console.log('Telegram bot launched successfully!');
    })
    .catch((error) => {
      console.error('Failed to launch Telegram bot:', error);
    });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));