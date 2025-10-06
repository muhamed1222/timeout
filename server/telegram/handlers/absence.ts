import { Context } from 'telegraf';
import { SessionData } from '../types';
import { storage } from '../../storage';

export async function handleAbsence(ctx: Context & { session: SessionData }) {
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

    let reason = '';
    let status = '';

    switch (action) {
      case 'absence_planned':
        reason = 'Заблаговременное уведомление об отсутствии';
        status = 'planned';
        break;
      case 'absence_sick':
        reason = 'Болезнь';
        status = 'sick';
        break;
      case 'absence_personal':
        reason = 'Личные обстоятельства';
        status = 'personal';
        break;
      case 'absence_other':
        reason = 'Другие причины';
        status = 'other';
        break;
      default:
        return ctx.answerCbQuery('❌ Неизвестная причина отсутствия');
    }

    // Отменяем смену
    await storage.updateShift(todayShift.id, {
      status: 'cancelled'
    });

    // Создаем запись об отсутствии
    await storage.createException({
      employee_id: employeeId,
      date: today.toISOString().split('T')[0],
      kind: 'absence',
      severity: 1,
      details: {
        reason,
        status,
        shift_id: todayShift.id,
        reported_at: new Date().toISOString()
      }
    });

    await ctx.answerCbQuery(`✅ Отсутствие зафиксировано: ${reason}`);

    await ctx.reply(`
📝 *Отсутствие зафиксировано*

📅 *Дата:* ${today.toLocaleDateString('ru-RU')}
❌ *Причина:* ${reason}
⏰ *Время уведомления:* ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

✅ Ваше отсутствие зафиксировано в системе.
Администратор получит уведомление.

*Доступные команды:*
/status - Текущий статус
/help - Справка
    `, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error handling absence:', error);
    await ctx.answerCbQuery('❌ Ошибка фиксации отсутствия');
  }
}
