import { Context } from 'telegraf';
import { SessionData } from '../types.js';
import { storage } from '../../storage.js';
import { cache } from '../../lib/cache.js';
import { logger } from '../../lib/logger.js';

export async function handleShiftActions(ctx: Context & { session: SessionData }) {
  const action = (ctx as any)?.callbackQuery?.data as string | undefined;
  const employeeId = ctx.session.employeeId;
  
  if (!action || !employeeId) {
    return ctx.answerCbQuery('❌ Ошибка: данные сессии не найдены');
  }

  try {
    // Получаем текущую смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await storage.getShiftsByEmployee(employeeId);
    const todayShift = shifts.find(s => {
      const shiftDate = new Date(s.planned_start_at);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() === today.getTime();
    });

    if (!todayShift) {
      return ctx.answerCbQuery('❌ Смена на сегодня не найдена');
    }

    let message = '';
    let success = false;

    switch (action) {
      case 'start_shift':
        if (todayShift.status === 'planned') {
          await storage.updateShift(todayShift.id, {
            status: 'active',
            actual_start_at: new Date()
          });

          await storage.createWorkInterval({
            shift_id: todayShift.id,
            start_at: new Date(),
            source: 'bot'
          });

          // Invalidate company stats cache
          const employee = await storage.getEmployee(employeeId);
          if (employee) {
            cache.delete(`company:${employee.company_id}:stats`);
          }

          message = '✅ Смена начата! Удачной работы!';
          success = true;
        } else {
          message = '❌ Смена уже начата или завершена';
        }
        break;

      case 'start_break':
        if (todayShift.status === 'active') {
          // Завершаем текущий рабочий интервал
          const workIntervals = await storage.getWorkIntervalsByShift(todayShift.id);
          const activeWork = workIntervals.find(wi => !wi.end_at);
          
          if (activeWork) {
            await storage.updateWorkInterval(activeWork.id, {
              end_at: new Date()
            });
          }

          // Создаем интервал перерыва
          await storage.createBreakInterval({
            shift_id: todayShift.id,
            start_at: new Date(),
            type: 'lunch',
            source: 'bot'
          });

          message = '🍽 Перерыв начат! Приятного отдыха!';
          success = true;
        } else {
          message = '❌ Смена не активна';
        }
        break;

      case 'end_break':
        // Завершаем перерыв
        const breakIntervals = await storage.getBreakIntervalsByShift(todayShift.id);
        const activeBreak = breakIntervals.find(bi => !bi.end_at);
        
        if (activeBreak) {
          await storage.updateBreakInterval(activeBreak.id, {
            end_at: new Date()
          });

          // Начинаем новый рабочий интервал
          await storage.createWorkInterval({
            shift_id: todayShift.id,
            start_at: new Date(),
            source: 'bot'
          });

          message = '☑️ Перерыв завершён! С возвращением к работе!';
          success = true;
        } else {
          message = '❌ Активный перерыв не найден';
        }
        break;

      case 'end_shift':
        if (todayShift.status === 'active') {
          // Завершаем текущий рабочий интервал
          const workIntervals = await storage.getWorkIntervalsByShift(todayShift.id);
          const activeWork = workIntervals.find(wi => !wi.end_at);
          
          if (activeWork) {
            await storage.updateWorkInterval(activeWork.id, {
              end_at: new Date()
            });
          }

          // Завершаем смену
          await storage.updateShift(todayShift.id, {
            status: 'completed',
            actual_end_at: new Date()
          });

          // Invalidate company stats cache
          const employeeEndShift = await storage.getEmployee(employeeId);
          if (employeeEndShift) {
            cache.delete(`company:${employeeEndShift.company_id}:stats`);
          }

          message = '🕔 Смена завершена! Спасибо за работу!';
          success = true;

          // Запрашиваем отчёт
          ctx.session.waitingForReport = todayShift.id;
          setTimeout(() => {
            ctx.reply(`
📝 *Отчёт о смене*

Пожалуйста, расскажите, что вы сделали сегодня:

• Какие задачи выполнили?
• Были ли проблемы или задержки?
• Что планируете на завтра?

Просто напишите сообщение с отчётом.
            `, { parse_mode: 'Markdown' });
          }, 2000);
        } else {
          message = '❌ Смена не активна';
        }
        break;

      default:
        message = '❌ Неизвестное действие';
    }

    await ctx.answerCbQuery(message);
    
    if (success) {
      // Обновляем меню
      setTimeout(() => {
        showUpdatedMenu(ctx, todayShift.id);
      }, 1000);
    }

  } catch (error) {
    logger.error('Error in shift action', error);
    await ctx.answerCbQuery('❌ Ошибка выполнения действия');
  }
}

async function showUpdatedMenu(ctx: Context & { session: SessionData }, shiftId: string) {
  try {
    const shift = await storage.getShift(shiftId);
    if (!shift) return;

    const workIntervals = await storage.getWorkIntervalsByShift(shiftId);
    const breakIntervals = await storage.getBreakIntervalsByShift(shiftId);
    
    const activeWork = workIntervals.find(wi => !wi.end_at);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    let status = '📅 Запланирована';
    if (shift.status === 'active') {
      status = activeBreak ? '🍽 Перерыв' : '💼 Работаю';
    } else if (shift.status === 'completed') {
      status = '✅ Завершена';
    }

    let keyboard: any[] = [];

    if (shift.status === 'planned') {
      keyboard = [
        [
          { text: '▶️ Начать смену', callback_data: 'start_shift' },
          { text: '❌ Не смогу прийти', callback_data: 'absence_planned' }
        ]
      ];
    } else if (shift.status === 'active') {
      if (activeBreak) {
        keyboard = [
          [{ text: '☑️ Вернулся', callback_data: 'end_break' }]
        ];
      } else {
        keyboard = [
          [
            { text: '🍽 Начать перерыв', callback_data: 'start_break' },
            { text: '🕔 Завершить смену', callback_data: 'end_shift' }
          ]
        ];
      }
    }

    const message = `
📊 *Статус смены: ${status}*

⏰ *Время:* ${new Date(shift.planned_start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(shift.planned_end_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

${activeWork ? `⏱ *Начал работу:* ${new Date(activeWork.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
${activeBreak ? `🍽 *Перерыв с:* ${new Date(activeBreak.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
    `;

    if (keyboard.length > 0) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }

  } catch (error) {
    logger.error('Error showing updated menu', error);
  }
}
