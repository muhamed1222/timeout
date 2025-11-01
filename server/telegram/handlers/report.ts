import { Context } from 'telegraf';
import { SessionData } from '../types.js';
import { repositories } from '../../repositories/index.js';
import { logger } from '../../lib/logger.js';

export async function handleReport(ctx: Context & { session: SessionData }, shiftId?: string) {
  const reportShiftId = shiftId || ctx.session.waitingForReport;
  
  if (!reportShiftId) {
    return ctx.reply('❌ Ошибка: смена для отчёта не найдена');
  }

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
  
  if (!text || text.trim().length < 10) {
    return ctx.reply(`
❌ *Отчёт слишком короткий*

Пожалуйста, напишите более подробный отчёт о выполненной работе (минимум 10 символов).

Пример:
• Выполнил задачи по проекту X
• Встретился с клиентом Y
• Подготовил документы Z
• Проблемы: задержка поставки материалов
    `, { parse_mode: 'Markdown' });
  }

  try {
    // Создаем отчёт
    await repositories.shift.createDailyReport({
      shift_id: reportShiftId,
      done_items: [text.trim()],
      submitted_at: new Date()
    });

    // Очищаем сессию
    ctx.session.waitingForReport = undefined;

    await ctx.reply(`
✅ *Отчёт сохранён*

Спасибо за подробный отчёт о проделанной работе!

📊 Ваш отчёт будет доступен администратору в системе учёта.

*Доступные команды:*
/status - Текущий статус
/help - Справка
    `, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error saving report', error);
    ctx.reply('❌ Ошибка сохранения отчёта. Попробуйте позже.');
  }
}
