/* eslint-env node */
import { Context } from "telegraf";
import type { InlineKeyboardButton } from "telegraf/types";
import { SessionData } from "../types.js";
import { repositories } from "../../repositories/index.js";
import { invalidateCompanyStatsByShift } from "../../lib/utils/cache.js";
import { logger } from "../../lib/logger.js";

type InlineKeyboard = InlineKeyboardButton[][];

export async function handleShiftActions(ctx: Context & { session: SessionData }) {
  const action = (ctx as any)?.callbackQuery?.data as string | undefined;
  const employeeId = ctx.session.employeeId;
  
  if (!action || !employeeId) {
    return ctx.answerCbQuery("❌ Ошибка: данные сессии не найдены");
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

    let message = "";
    let success = false;
    let shiftIdForMenu = todayShift?.id;

    switch (action) {
      case "start_shift":
        // Если смены нет, создаём новую
        if (!todayShift) {
          const employee = await repositories.employee.findById(employeeId);
          if (!employee) {
            return ctx.answerCbQuery("❌ Сотрудник не найден");
          }

          const now = new Date();
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);

          const newShift = await repositories.shift.create({
            employee_id: employeeId,
            planned_start_at: now,
            planned_end_at: endOfDay,
            status: "active",
            actual_start_at: now,
          });

          await repositories.shift.createWorkInterval({
            shift_id: newShift.id,
            start_at: now,
            source: "bot",
          });

          // Invalidate company stats cache
          await invalidateCompanyStatsByShift({ employee_id: employeeId });

          message = "✅ Смена начата! Удачной работы!";
          success = true;
          shiftIdForMenu = newShift.id;
        } else if (todayShift.status === "planned") {
          await repositories.shift.update(todayShift.id, {
            status: "active",
            actual_start_at: new Date(),
          });

          await repositories.shift.createWorkInterval({
            shift_id: todayShift.id,
            start_at: new Date(),
            source: "bot",
          });

          // Invalidate company stats cache
          const employee = await repositories.employee.findById(employeeId);
          if (employee) {
            await invalidateCompanyStatsByShift({ employee_id: employee.id });
          }

          message = "✅ Смена начата! Удачной работы!";
          success = true;
        } else {
          message = "❌ Смена уже начата или завершена";
        }
        break;

      case "start_break":
        if (!todayShift) {
          message = "❌ Смена не найдена";
        } else if (todayShift.status === "active") {
          // Завершаем текущий рабочий интервал
          const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(todayShift.id);
          const activeWork = workIntervals.find(wi => !wi.end_at);
          
          if (activeWork) {
            await repositories.shift.updateWorkInterval(activeWork.id, {
              end_at: new Date(),
            });
          }

          // Создаем интервал перерыва
          await repositories.shift.createBreakInterval({
            shift_id: todayShift.id,
            start_at: new Date(),
            type: "lunch",
            source: "bot",
          });

          message = "🍽 Перерыв начат! Приятного отдыха!";
          success = true;
        } else {
          message = "❌ Смена не активна";
        }
        break;

      case "end_break":
        if (!todayShift) {
          message = "❌ Смена не найдена";
        } else {
          // Завершаем перерыв
          const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(todayShift.id);
          const activeBreak = breakIntervals.find(bi => !bi.end_at);
        
          if (activeBreak) {
            await repositories.shift.updateBreakInterval(activeBreak.id, {
              end_at: new Date(),
            });

            // Начинаем новый рабочий интервал
            await repositories.shift.createWorkInterval({
              shift_id: todayShift.id,
              start_at: new Date(),
              source: "bot",
            });

            message = "☑️ Перерыв завершён! С возвращением к работе!";
            success = true;
          } else {
            message = "❌ Активный перерыв не найден";
          }
        }
        break;

      case "end_shift":
        if (!todayShift) {
          message = "❌ Смена не найдена";
        } else if (todayShift.status === "active") {
          // Завершаем текущий рабочий интервал
          const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(todayShift.id);
          const activeWork = workIntervals.find(wi => !wi.end_at);
          
          if (activeWork) {
            await repositories.shift.updateWorkInterval(activeWork.id, {
              end_at: new Date(),
            });
          }

          // Завершаем смену
          await repositories.shift.update(todayShift.id, {
            status: "completed",
            actual_end_at: new Date(),
          });

          // Invalidate company stats cache
          if (employeeId) {
            await invalidateCompanyStatsByShift({ employee_id: employeeId });
          }

          message = "🕔 Смена завершена! Спасибо за работу!";
          success = true;

          // Запрашиваем отчёт
          ctx.session.waitingForReport = todayShift.id;
          void setTimeout(() => {
            void ctx.reply(`
📝 *Отчёт о смене*

Пожалуйста, расскажите, что вы сделали сегодня:

• Какие задачи выполнили?
• Были ли проблемы или задержки?
• Что планируете на завтра?

Просто напишите сообщение с отчётом.
            `, { parse_mode: "Markdown" });
          }, 2000);
        } else {
          message = "❌ Смена не активна";
        }
        break;

      default:
        message = "❌ Неизвестное действие";
    }

    try {
      await ctx.answerCbQuery(message);
    } catch (answerError: any) {
      // Если не удалось ответить (SSL/network error), логируем, но продолжаем
      if (answerError.code === "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC" ||
          answerError.code === "ECONNRESET" ||
          answerError.code === "ETIMEDOUT") {
        logger.warn("Network error answering callback query", { code: answerError.code });
      } else {
        logger.error("Error answering callback query", { error: answerError });
      }
    }
    
    if (success && shiftIdForMenu) {
      // Обновляем меню
      void setTimeout(() => {
        void showUpdatedMenu(ctx, shiftIdForMenu).catch((menuError: any) => {
          // Обрабатываем сетевые ошибки при обновлении меню
          if (menuError.code === "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC" ||
              menuError.code === "ECONNRESET" ||
              menuError.code === "ETIMEDOUT") {
            logger.warn("Network error updating menu", { code: menuError.code });
          } else {
            logger.error("Error updating menu", { error: menuError });
          }
        });
      }, 1000);
    }

  } catch (error) {
    const err = error as any;
    logger.error("Error in shift action", { error, code: err.code });
    
    // Не пытаемся отвечать при сетевых ошибках
    if (err.code === "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT") {
      logger.warn("Network error in handleShiftActions", { code: err.code });
      return;
    }
    
    try {
      await ctx.answerCbQuery("❌ Ошибка выполнения действия");
    } catch (replyError) {
      logger.error("Error sending error message", { error: replyError });
    }
  }
}

async function showUpdatedMenu(ctx: Context & { session: SessionData }, shiftId: string) {
  try {
    const shift = await repositories.shift.findById(shiftId);
    if (!shift) {
      // Если смена была удалена, показываем кнопку для начала новой
      const keyboard: InlineKeyboard = [
        [
          { text: "▶️ Начать смену", callback_data: "start_shift" },
        ],
      ];
      return ctx.reply(`
📊 *Управление сменой*

📅 Смена не найдена. Вы можете начать новую смену.

Выберите действие:
      `, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    }

    const workIntervals = await repositories.shift.findWorkIntervalsByShiftId(shiftId);
    const breakIntervals = await repositories.shift.findBreakIntervalsByShiftId(shiftId);
    
    const activeWork = workIntervals.find(wi => !wi.end_at);
    const activeBreak = breakIntervals.find(bi => !bi.end_at);

    let status = "📅 Запланирована";
    if (shift.status === "active") {
      status = activeBreak ? "🍽 Перерыв" : "💼 Работаю";
    } else if (shift.status === "completed") {
      status = "✅ Завершена";
    }

    let keyboard: InlineKeyboard = [];

    if (shift.status === "planned") {
      keyboard = [
        [
          { text: "▶️ Начать смену", callback_data: "start_shift" },
        ],
      ];
    } else if (shift.status === "active") {
      if (activeBreak) {
        keyboard = [
          [{ text: "☑️ Вернулся", callback_data: "end_break" }],
        ];
      } else {
        keyboard = [
          [
            { text: "🍽 Начать перерыв", callback_data: "start_break" },
            { text: "🕔 Завершить смену", callback_data: "end_shift" },
          ],
        ];
      }
    }

    const message = `
📊 *Статус смены: ${status}*

⏰ *Время:* ${new Date(shift.planned_start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - ${new Date(shift.planned_end_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}

${activeWork ? `⏱ *Начал работу:* ${new Date(activeWork.start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""}
${activeBreak ? `🍽 *Перерыв с:* ${new Date(activeBreak.start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""}
    `;

    if (keyboard.length > 0) {
      void ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } else {
      void ctx.reply(message, { parse_mode: "Markdown" });
    }

  } catch (error) {
    logger.error("Error showing updated menu", error);
  }
}
