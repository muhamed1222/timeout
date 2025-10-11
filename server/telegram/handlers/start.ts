import { Context } from 'telegraf';
import { SessionData } from '../types';
import { storage } from '../../storage';

export async function handleStart(ctx: Context & { session: SessionData }) {
  console.log('Start command received:', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    messageText: ctx.message && 'text' in ctx.message ? ctx.message.text : 'No text'
  });

  const startParam = ctx.message && 'text' in ctx.message ? 
    ctx.message.text.split(' ')[1] : null;
  
  if (!startParam) {
    console.log('No start parameter provided, showing access denied message');
    return ctx.reply(`
❌ *Доступ запрещён*

Этот бот работает только по приглашению от вашей компании.

Для подключения обратитесь к администратору и получите специальную ссылку-приглашение.
    `, { parse_mode: 'Markdown' });
  }

  if (!ctx.from?.id) {
    console.error('No user ID in context');
    return ctx.reply(`
❌ *Ошибка аутентификации*

Не удалось определить пользователя Telegram.
Попробуйте позже или обратитесь к администратору.
    `, { parse_mode: 'Markdown' });
  }

  try {
    console.log('Processing invite code:', startParam);
    // Проверяем инвайт-код
    const invite = await storage.getEmployeeInviteByCode(startParam);
    
    if (!invite) {
      console.log('Invite not found:', startParam);
      return ctx.reply(`
❌ *Неверный код приглашения*

Код приглашения не найден или уже использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    if (invite.used_at) {
      console.log('Invite already used:', startParam);
      // Если инвайт уже использован тем же сотрудником (тот же Telegram ID),
      // делаем операцию идемпотентной: обновляем/переносим сотрудника и продолжаем
      if (invite.used_by_employee) {
        const existingEmployee = await storage.getEmployee(invite.used_by_employee);
        const currentTelegramId = ctx.from.id.toString();

        if (existingEmployee && existingEmployee.telegram_user_id === currentTelegramId) {
          const needsCompanyTransfer = existingEmployee.company_id !== invite.company_id;
          const updated = await storage.updateEmployee(existingEmployee.id, {
            company_id: needsCompanyTransfer ? invite.company_id : existingEmployee.company_id,
            full_name: invite.full_name || existingEmployee.full_name,
            position: invite.position || existingEmployee.position,
            telegram_user_id: currentTelegramId,
            status: 'active'
          });

          // Сохраняем в сессию и продолжаем стандартный флоу
          if (!ctx.session) ctx.session = {} as any;
          ctx.session.employeeId = (updated || existingEmployee).id;
          ctx.session.companyId = (updated || existingEmployee).company_id;

          const company = await storage.getCompany((updated || existingEmployee).company_id);
          await ctx.reply(`
🎉 *Добро пожаловать!*

👤 *Сотрудник:* ${(updated || existingEmployee).full_name}
🏢 *Компания:* ${company?.name || 'Не указана'}
${(updated || existingEmployee).position ? `💼 *Должность:* ${(updated || existingEmployee).position}` : ''}

✅ Вы успешно подключены к системе учёта рабочего времени.

*Доступные команды:*
/status - Текущий статус смены
/help - Справка по командам

Используйте кнопки для управления сменой.
          `, { parse_mode: 'Markdown' });

          await showMainMenu(ctx);
          return;
        }
      }

      // Иначе для чужого/неподходящего инвайта — сообщение об ошибке
      return ctx.reply(`
❌ *Код уже использован*

Этот код приглашения уже был использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    console.log('Creating/updating employee for Telegram ID:', ctx.from.id);
    // Создаем или обновляем сотрудника
    let employee = await storage.getEmployeeByTelegramId(ctx.from.id.toString());
    
    if (!employee) {
      // Создаем нового сотрудника
      employee = await storage.createEmployee({
        company_id: invite.company_id,
        full_name: invite.full_name || 'Сотрудник',
        position: invite.position,
        telegram_user_id: ctx.from.id.toString(),
        status: 'active'
      });
      console.log('Created new employee:', employee.id);
    } else {
      // Перенос сотрудника в компанию из инвайта, если отличается
      const needsCompanyTransfer = employee.company_id !== invite.company_id;
      const updated = await storage.updateEmployee(employee.id, {
        company_id: needsCompanyTransfer ? invite.company_id : employee.company_id,
        full_name: invite.full_name || employee.full_name,
        position: invite.position || employee.position,
        telegram_user_id: ctx.from.id.toString(),
        status: 'active'
      });
      console.log(
        needsCompanyTransfer
          ? `Transferred employee to company ${invite.company_id}`
          : 'Updated existing employee',
        updated?.id
      );
      employee = updated || employee;
    }

    // Отмечаем инвайт как использованный
    await storage.useEmployeeInvite(startParam, employee!.id);
    console.log('Marked invite as used:', startParam);

    // Сохраняем данные в сессию
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.employeeId = employee!.id;
    ctx.session.companyId = employee!.company_id;

    // Получаем информацию о компании
    const company = await storage.getCompany(employee!.company_id);

    console.log('Sending welcome message to user:', ctx.from.id);
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

  } catch (error: unknown) {
    console.error('Error in start handler:', error as any);
    ctx.reply(`
❌ *Ошибка подключения*

Произошла ошибка при подключении к системе.
Попробуйте позже или обратитесь к администратору.

Ошибка: ${(error as any)?.message || 'Неизвестная ошибка'}
    `, { parse_mode: 'Markdown' });
  }
}

async function showMainMenu(ctx: Context & { session: SessionData }) {
  if (!ctx.session) {
    console.error('No session available in showMainMenu');
    return;
  }
  
  const employeeId = ctx.session.employeeId;
  if (!employeeId) {
    console.error('No employeeId in session');
    return;
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
