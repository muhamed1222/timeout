import { Context } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/types';
import { SessionData } from '../types.js';
import { repositories } from '../../repositories/index.js';
import { logger } from '../../lib/logger.js';

type InlineKeyboard = InlineKeyboardButton[][];

export async function handleStart(ctx: Context & { session: SessionData }) {
  logger.info('Start command received', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    messageText: ctx.message && 'text' in ctx.message ? ctx.message.text : 'No text'
  });

  const startParam = ctx.message && 'text' in ctx.message ? 
    ctx.message.text.split(' ')[1] : null;
  
  // Если нет параметра start, но сотрудник уже авторизован - показываем главное меню
  if (!startParam && ctx.session?.employeeId) {
    logger.info('Employee already authorized, showing main menu');
    try {
      await showMainMenu(ctx);
    } catch (error: any) {
      logger.error('Error showing main menu in start handler', {
        error: error.message || String(error),
        code: error.code,
        stack: error.stack
      });
      // Попробуем отправить простое сообщение
      try {
        await ctx.reply('❌ Ошибка загрузки меню. Попробуйте команду /status');
      } catch (replyError) {
        logger.error('Failed to send error message', { error: replyError });
      }
    }
    return;
  }
  
  if (!startParam) {
    logger.info('No start parameter provided, showing access denied message');
    return ctx.reply(`
❌ *Доступ запрещён*

Этот бот работает только по приглашению от вашей компании.

Для подключения обратитесь к администратору и получите специальную ссылку-приглашение.
    `, { parse_mode: 'Markdown' });
  }

  if (!ctx.from?.id) {
    logger.error('No user ID in context');
    return ctx.reply(`
❌ *Ошибка аутентификации*

Не удалось определить пользователя Telegram.
Попробуйте позже или обратитесь к администратору.
    `, { parse_mode: 'Markdown' });
  }

  try {
    logger.info('Processing invite code', { code: startParam });
    // Проверяем инвайт-код
    const invite = await repositories.invite.findByCode(startParam);
    
    if (!invite) {
      logger.warn('Invite not found', { code: startParam });
      return ctx.reply(`
❌ *Неверный код приглашения*

Код приглашения не найден или уже использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    // Сначала проверяем, есть ли уже сотрудник с этим Telegram ID
    const currentTelegramId = ctx.from.id.toString();
    logger.info('Checking for existing employee with Telegram ID', { telegramId: currentTelegramId });
    let existingEmployee = await repositories.employee.findByTelegramId(currentTelegramId);
    logger.info('Found existing employee', existingEmployee ? {
      id: existingEmployee.id,
      company_id: existingEmployee.company_id,
      full_name: existingEmployee.full_name
    } : { found: false });
    
    if (existingEmployee) {
      logger.info('Found existing employee with Telegram ID', { telegramId: currentTelegramId });
      
      // Если сотрудник уже существует, обновляем его данные и переносим в новую компанию
      const needsCompanyTransfer = existingEmployee.company_id !== invite.company_id;
      logger.info('Company transfer needed', { needsTransfer: needsCompanyTransfer, fromCompany: existingEmployee.company_id, toCompany: invite.company_id });
      
      const updated = await repositories.employee.update(existingEmployee.id, {
        company_id: invite.company_id,
        full_name: invite.full_name || existingEmployee.full_name,
        position: invite.position || existingEmployee.position,
        telegram_user_id: currentTelegramId,
        status: 'active'
      });
      logger.info('Updated employee', updated ? {
        id: updated.id,
        company_id: updated.company_id,
        full_name: updated.full_name
      } : { updated: false });

      // Помечаем инвайт как использованный
      logger.info('Marking invite as used', { inviteCode: invite.code, employeeId: existingEmployee.id });
      await repositories.invite.useInvite(invite.code, existingEmployee.id);
      logger.info('Invite marked as used successfully');

      // Сохраняем в сессию и продолжаем стандартный флоу
      if (!ctx.session) ctx.session = {} as any;
      ctx.session.employeeId = (updated || existingEmployee).id;
      ctx.session.companyId = invite.company_id;

      const company = await repositories.company.findById(invite.company_id);
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

    if (invite.used_at) {
      logger.warn('Invite already used', { code: startParam });
      
      // Если сотрудник уже авторизован и использует свой же инвайт - показываем главное меню
      if (ctx.session?.employeeId && invite.used_by_employee === ctx.session.employeeId) {
        logger.info('Employee using their own invite, showing main menu');
        await showMainMenu(ctx);
        return;
      }
      
      return ctx.reply(`
❌ *Код уже использован*

Этот код приглашения уже был использован.
Обратитесь к администратору за новым приглашением.
      `, { parse_mode: 'Markdown' });
    }

    logger.info('Creating/updating employee for Telegram ID', { telegramId: ctx.from.id });
    // Создаем или обновляем сотрудника
    let employee = await repositories.employee.findByTelegramId(ctx.from.id.toString());
    
    if (!employee) {
      // Создаем нового сотрудника
      employee = await repositories.employee.create({
        company_id: invite.company_id,
        full_name: invite.full_name || 'Сотрудник',
        position: invite.position,
        telegram_user_id: ctx.from.id.toString(),
        status: 'active'
      });
      logger.info('Created new employee', { employeeId: employee.id });
    } else {
      // Перенос сотрудника в компанию из инвайта, если отличается
      const needsCompanyTransfer = employee.company_id !== invite.company_id;
      const updated = await repositories.employee.update(employee.id, {
        company_id: needsCompanyTransfer ? invite.company_id : employee.company_id,
        full_name: invite.full_name || employee.full_name,
        position: invite.position || employee.position,
        telegram_user_id: ctx.from.id.toString(),
        status: 'active'
      });
      logger.info(
        needsCompanyTransfer ? 'Transferred employee to company' : 'Updated existing employee',
        { employeeId: updated?.id, companyId: invite.company_id }
      );
      employee = updated || employee;
    }

    // Отмечаем инвайт как использованный
    await repositories.invite.useInvite(startParam, employee!.id);
    logger.info('Marked invite as used', { code: startParam });

    // Сохраняем данные в сессию
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.employeeId = employee!.id;
    ctx.session.companyId = employee!.company_id;

    // Получаем информацию о компании
    const company = await repositories.company.findById(employee!.company_id);

    logger.info('Sending welcome message to user', { userId: ctx.from.id });
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
    logger.error('Error in start handler', error);
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
    logger.error('No session available in showMainMenu');
    return;
  }
  
  const employeeId = ctx.session.employeeId;
  if (!employeeId) {
    logger.error('No employeeId in session');
    return;
  }

  try {
    // Получаем текущую смену
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await repositories.shift.findByEmployeeId(employeeId);
    const todayShift = shifts.find(s => {
      const shiftDate = new Date(s.planned_start_at);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() === today.getTime();
    });

    let keyboard: InlineKeyboard = [];

    // Если смены нет, показываем кнопку для начала новой смены
    if (!todayShift) {
      keyboard = [
        [
          { text: '▶️ Начать смену', callback_data: 'start_shift' }
        ]
      ];
      
      try {
        await ctx.reply(`
📊 *Управление сменой*

📅 На сегодня смена не запланирована. Вы можете начать смену вручную.

Выберите действие:
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
        logger.info('Main menu message sent (no shift)');
      } catch (error: any) {
        logger.error('Error sending main menu message (no shift)', {
          error: error.message || String(error),
          code: error.code
        });
        // Попробуем отправить простое сообщение без форматирования
        try {
          await ctx.reply('📊 Управление сменой\n\n📅 На сегодня смена не запланирована. Нажмите кнопку ниже, чтобы начать смену.', {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (retryError) {
          logger.error('Failed to send fallback message', { error: retryError });
        }
      }
      return;
    }

    // Определяем доступные действия в зависимости от статуса смены
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(todayShift.id);
    
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    if (todayShift.status === 'planned') {
      keyboard = [
        [
          { text: '▶️ Начать смену', callback_data: 'start_shift' }
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
      try {
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
        logger.info('Main menu message sent', { shiftStatus: todayShift.status });
      } catch (error: any) {
        logger.error('Error sending main menu message', {
          error: error.message || String(error),
          code: error.code,
          shiftStatus: todayShift.status
        });
        // Попробуем отправить без Markdown форматирования
        try {
          await ctx.reply(
            `📊 Управление сменой\n\n⏰ Планируемое время: ${new Date(todayShift.planned_start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(todayShift.planned_end_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n\nВыберите действие:`,
            {
              reply_markup: {
                inline_keyboard: keyboard
              }
            }
          );
        } catch (retryError) {
          logger.error('Failed to send fallback message', { error: retryError });
        }
      }
    }

  } catch (error) {
    const err = error as any;
    logger.error('Error showing main menu', {
      error: err.message || String(error),
      code: err.code,
      stack: err.stack
    });
    
    // Не пытаемся отвечать при сетевых ошибках
    if (err.code === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT') {
      logger.warn('Network error in showMainMenu', { code: err.code });
      return;
    }
    
    try {
      await ctx.reply('❌ Ошибка загрузки меню. Попробуйте позже или используйте /status');
    } catch (replyError) {
      logger.error('Failed to send error message', { error: replyError });
    }
  }
}
