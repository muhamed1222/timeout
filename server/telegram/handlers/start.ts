import { Context } from 'telegraf';
import { SessionData } from '../types';
import { storage } from '../../storage';

export async function handleStart(ctx: Context & { session: SessionData }) {
  const startParam = ctx.message && 'text' in ctx.message ? 
    ctx.message.text.split(' ')[1] : null;
  
  if (!startParam) {
    return ctx.reply(`
❌ *Доступ запрещён*

Этот бот работает только по приглашению от вашей компании.

Для подключения обратитесь к администратору и получите специальную ссылку-приглашение.
    `, { parse_mode: 'Markdown' });
  }

  try {
    // Проверяем инвайт-код
    const invite = await storage.getEmployeeInviteByCode(startParam);
    
    if (!invite) {
      return ctx.reply(`
❌ *Неверный код приглашения*

Код приглашения не найден или уже использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    if (invite.used_at) {
      return ctx.reply(`
❌ *Код уже использован*

Этот код приглашения уже был использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    // Создаем или обновляем сотрудника
    let employee = await storage.getEmployeeByTelegramId(ctx.from!.id.toString());
    
    if (!employee) {
      // Создаем нового сотрудника
      employee = await storage.createEmployee({
        company_id: invite.company_id,
        full_name: invite.full_name || 'Сотрудник',
        position: invite.position,
        telegram_user_id: ctx.from!.id.toString(),
        status: 'active'
      });
    } else {
      // Обновляем существующего сотрудника
      employee = await storage.updateEmployee(employee.id, {
        telegram_user_id: ctx.from!.id.toString(),
        status: 'active'
      });
    }

    // Отмечаем инвайт как использованный
    await storage.useEmployeeInvite(startParam, employee.id);

    // Сохраняем данные в сессию
    ctx.session.employeeId = employee.id;
    ctx.session.companyId = employee.company_id;

    // Получаем информацию о компании
    const company = await storage.getCompany(employee.company_id);

    await ctx.reply(`
🎉 *Добро пожаловать!*

👤 *Сотрудник:* ${employee.full_name}
🏢 *Компания:* ${company?.name || 'Не указана'}
${employee.position ? `💼 *Должность:* ${employee.position}` : ''}

✅ Вы успешно подключены к системе учёта рабочего времени.

*Доступные команды:*
/status - Текущий статус смены
/help - Справка по командам

Используйте кнопки для управления сменой.
    `, { parse_mode: 'Markdown' });

    // Показываем главное меню
    await showMainMenu(ctx);

  } catch (error) {
    console.error('Error in start handler:', error);
    ctx.reply(`
❌ *Ошибка подключения*

Произошла ошибка при подключении к системе.
Попробуйте позже или обратитесь к администратору.
    `, { parse_mode: 'Markdown' });
  }
}

async function showMainMenu(ctx: Context & { session: SessionData }) {
  const employeeId = ctx.session.employeeId;
  if (!employeeId) return;

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
      return ctx.reply(`
📅 *На сегодня смена не запланирована*

Обратитесь к администратору для планирования смены.
      `, { parse_mode: 'Markdown' });
    }

    // Определяем доступные действия в зависимости от статуса смены
    const workIntervals = await storage.getWorkIntervalsByShift(todayShift.id);
    const breakIntervals = await storage.getBreakIntervalsByShift(todayShift.id);
    
    const activeWork = workIntervals.find(wi => !wi.end_at);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    let keyboard: any[] = [];

    if (todayShift.status === 'planned') {
      keyboard = [
        [
          { text: '▶️ Начать смену', callback_data: 'start_shift' },
          { text: '❌ Не смогу прийти', callback_data: 'absence_planned' }
        ]
      ];
    } else if (todayShift.status === 'active') {
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

    if (keyboard.length > 0) {
      await ctx.reply(`
📊 *Управление сменой*

⏰ *Планируемое время:* ${new Date(todayShift.planned_start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(todayShift.planned_end_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

Выберите действие:
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    }

  } catch (error) {
    console.error('Error showing main menu:', error);
    ctx.reply('❌ Ошибка загрузки меню. Попробуйте позже.');
  }
}
