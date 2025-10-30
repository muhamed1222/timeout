import { Telegraf, Context, session } from 'telegraf';
import { SessionData } from './types.js';
import { handleStart } from './handlers/start.js';
import { handleShiftActions } from './handlers/shiftActions.js';
import { handleAbsence } from './handlers/absence.js';
import { handleReport } from './handlers/report.js';
import { sendShiftReminder } from './handlers/reminders.js';
import { storage } from '../storage.js';
import { logger } from '../lib/logger.js';

const bot = new Telegraf<Context & { session: SessionData }>(process.env.TELEGRAM_BOT_TOKEN!);

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
      const employee = await storage.getEmployeeByTelegramId(telegramId);
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
❌ Не смогу прийти

*Примечание:* Бот работает только по приглашению от вашей компании.
  `, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const employee = await storage.getEmployeeByTelegramId(telegramId);
    if (!employee) {
      return ctx.reply('❌ Вы не зарегистрированы в системе. Обратитесь к администратору.');
    }

    // Получаем текущую смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await storage.getShiftsByEmployee(employee.id);
    const todayShift = shifts.find(s => {
      const shiftDate = new Date(s.planned_start_at);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() === today.getTime();
    });

    if (!todayShift) {
      return ctx.reply('📅 На сегодня смена не запланирована.');
    }

    // Получаем интервалы работы и перерывов
    const workIntervals = await storage.getWorkIntervalsByShift(todayShift.id);
    const breakIntervals = await storage.getBreakIntervalsByShift(todayShift.id);

    const activeWork = workIntervals.find(wi => !wi.end_at);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    let status = '📅 Запланирована';
    if (todayShift.status === 'active') {
      status = activeBreak ? '🍽 Перерыв' : '💼 Работаю';
    } else if (todayShift.status === 'completed') {
      status = '✅ Завершена';
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

    ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error("Error getting status", { error });
    ctx.reply('❌ Ошибка получения статуса. Попробуйте позже.');
  }
});

// Обработчики callback-кнопок
bot.action(/^(start_shift|start_break|end_break|end_shift|report_shift)$/, (ctx) => handleShiftActions(ctx as any));
bot.action(/^absence_(.+)$/, (ctx) => handleAbsence(ctx as any));
bot.action(/^report_(.+)$/, (ctx) => handleReport(ctx as any));

// Обработчик текстовых сообщений (для отчётов)
bot.on('text', async (ctx) => {
  try {
    const session = ctx.session;
    
    if (session?.waitingForReport) {
      await handleReport(ctx, session.waitingForReport);
      session.waitingForReport = undefined;
    } else {
      await ctx.reply('Используйте кнопки для управления сменой или команду /help для справки.');
    }
  } catch (error) {
    logger.error("Error handling text message", { error });
    // Не пытаемся отвечать при ошибке
  }
});

// Обработка ошибок
bot.catch((err: unknown, ctx) => {
  logger.error("Bot error", { error: err });
  
  // Не пытаемся отвечать, если чат не найден
  if ((err as any).description && (err as any).description.includes('chat not found')) {
    logger.info("Chat not found, skipping reply");
    return;
  }
  
  try {
    ctx.reply('❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.');
  } catch (replyError) {
    logger.error("Error sending error message", { error: replyError });
  }
});

export { bot };
