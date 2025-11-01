import { Telegraf, Context, session } from 'telegraf';
import { SessionData } from './types.js';
import { handleStart } from './handlers/start.js';
import { handleShiftActions } from './handlers/shiftActions.js';
import { handleReport } from './handlers/report.js';
import { repositories } from '../repositories/index.js';
import { logger } from '../lib/logger.js';
import { getSecret } from '../lib/secrets.js';

const bot = new Telegraf<Context & { session: SessionData }>(getSecret('TELEGRAM_BOT_TOKEN'));

// Настройка сессий
bot.use(session({
  defaultSession: () => ({})
}));

// Middleware для логирования
bot.use((ctx, next) => {
  const text = (ctx as any)?.message?.text as string | undefined;
  logger.info("Telegram bot message", {
    timestamp: new Date().toISOString(),
    username: ctx.from?.username || 'Unknown',
    message: text || 'Callback'
  });
  return next();
});

// Middleware для авторизации сотрудников
bot.use(async (ctx, next) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    return next();
  }

  // Если сессия пустая, попробуем найти сотрудника по Telegram ID
  if (!ctx.session?.employeeId) {
    try {
      const employee = await repositories.employee.findByTelegramId(telegramId);
      if (employee) {
        logger.info("Auto-restoring session for employee", { employeeId: employee.id });
        ctx.session = {
          employeeId: employee.id,
          companyId: employee.company_id,
          ...ctx.session
        };
      }
    } catch (error) {
      logger.error("Error auto-restoring session", { error });
    }
  }

  return next();
});

// Обработчики команд
bot.start(handleStart);
bot.command('help', (ctx) => {
  ctx.reply(`
🤖 *Бот учёта рабочего времени*

*Доступные команды:*
/start - Начать работу с ботом
/status - Текущий статус смены
/help - Показать эту справку

*Основные действия:*
▶️ Начать смену
🍽 Начать перерыв  
☑️ Вернулся с перерыва
🕔 Завершить смену

*Примечание:* Бот работает только по приглашению от вашей компании.
  `, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const employee = await repositories.employee.findByTelegramId(telegramId);
    if (!employee) {
      return ctx.reply('❌ Вы не зарегистрированы в системе. Обратитесь к администратору.');
    }

    // Получаем текущую смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await repositories.shift.findByEmployeeId(employee.id);
    const todayShift = shifts.find(s => {
      const shiftDate = new Date(s.planned_start_at);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() === today.getTime();
    });

    if (!todayShift) {
      return ctx.reply(`
📅 *На сегодня смена не запланирована*

Вы можете начать смену вручную.

Выберите действие:
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '▶️ Начать смену', callback_data: 'start_shift' }
          ]]
        }
      });
    }

    // Получаем интервалы работы и перерывов
    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(todayShift.id);
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(todayShift.id);

    const activeWork = workIntervals.find(wi => !wi.end_at);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    let status = '📅 Запланирована';
    if (todayShift.status === 'active') {
      status = activeBreak ? '🍽 Перерыв' : '💼 Работаю';
    } else if (todayShift.status === 'completed') {
      status = '✅ Завершена';
    }

    let keyboard: any[] = [];
    if (todayShift.status === 'planned') {
      keyboard = [[
        { text: '▶️ Начать смену', callback_data: 'start_shift' }
      ]];
    } else if (todayShift.status === 'active') {
      if (activeBreak) {
        keyboard = [[
          { text: '☑️ Вернулся', callback_data: 'end_break' }
        ]];
      } else {
        keyboard = [[
          { text: '🍽 Начать перерыв', callback_data: 'start_break' },
          { text: '🕔 Завершить смену', callback_data: 'end_shift' }
        ]];
      }
    }

    const message = `
📊 *Статус смены*

👤 Сотрудник: ${employee.full_name}
📅 Дата: ${today.toLocaleDateString('ru-RU')}
⏰ Планируемое время: ${new Date(todayShift.planned_start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(todayShift.planned_end_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
📈 Статус: ${status}

${activeWork ? `⏱ Начал работу: ${new Date(activeWork.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
${activeBreak ? `🍽 Перерыв с: ${new Date(activeBreak.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
    `;

    if (keyboard.length > 0) {
      void ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } else {
      void ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    logger.error("Error getting status", { error });
    void ctx.reply('❌ Ошибка получения статуса. Попробуйте позже.');
  }
});

// Обработчики callback-кнопок
bot.action(/^(start_shift|start_break|end_break|end_shift|report_shift)$/, (ctx) => handleShiftActions(ctx));
bot.action(/^report_(.+)$/, (ctx) => handleReport(ctx));

// Обработчик текстовых сообщений (для отчётов)
bot.on('text', async (ctx) => {
  try {
    const session = ctx.session;
    
    if (session?.waitingForReport) {
      await handleReport(ctx, session.waitingForReport);
      session.waitingForReport = undefined;
    } else {
      void ctx.reply('Используйте кнопки для управления сменой или команду /help для справки.');
    }
  } catch (error) {
    const err = error as any;
    // Логируем, но не пытаемся отвечать при сетевых ошибках
    if (err.code === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.type === 'system') {
      logger.warn("Network error handling text message", { code: err.code });
      return;
    }
    logger.error("Error handling text message", { error });
  }
});

// Обработка ошибок
bot.catch((err: unknown, ctx) => {
  const error = err as any;
  
  // Логируем ошибку с деталями
  logger.error("Bot error", { 
    error: error.message || String(error),
    code: error.code,
    type: error.type,
    errno: error.errno
  });
  
  // Не пытаемся отвечать, если чат не найден
  if (error.description && error.description.includes('chat not found')) {
    logger.info("Chat not found, skipping reply");
    return;
  }
  
  // Не пытаемся отвечать при SSL/network ошибках - это временные проблемы
  if (error.code === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.type === 'system') {
    logger.warn("Network/SSL error, skipping reply", { code: error.code });
    return;
  }
  
  try {
    void ctx.reply('❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.');
  } catch (replyError) {
    logger.error("Error sending error message", { error: replyError });
  }
});

export { bot };
