/**
 * Scheduler Service - Автоматическое выполнение задач по расписанию
 */

import { shiftMonitor } from "./shiftMonitor.js";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getTelegramBotService } from "./telegramBot.js";

class Scheduler {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private remindersInterval: NodeJS.Timeout | null = null;
  
  /**
   * Запустить автоматический мониторинг нарушений
   * Проверяет нарушения каждые 5 минут
   */
  startShiftMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      logger.warn("Shift monitoring already started");
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Запустить сразу
    this.runShiftMonitoring();
    
    // Запускать периодически
    this.monitoringInterval = setInterval(() => {
      this.runShiftMonitoring();
    }, intervalMs);
    
    logger.info(`Shift monitoring started (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Остановить автоматический мониторинг
   */
  stopShiftMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("Shift monitoring stopped");
    }
  }

  /**
   * Выполнить проверку нарушений для всех компаний
   */
  private async runShiftMonitoring(): Promise<void> {
    try {
      logger.info("Running global shift monitoring...");
      const result = await shiftMonitor.runGlobalMonitoring();
      logger.info(`Shift monitoring completed: ${result.companiesProcessed} companies, ${result.totalViolations} violations, ${result.totalExceptions} exceptions`);
    } catch (error) {
      logger.error("Error running shift monitoring", error);
    }
  }

  /**
   * Запустить автоматическую отправку напоминаний
   * Проверяет напоминания каждую минуту
   */
  startRemindersSending(intervalMinutes: number = 1): void {
    if (this.remindersInterval) {
      logger.warn("Reminders sending already started");
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Запустить сразу
    this.sendPendingReminders();
    
    // Запускать периодически
    this.remindersInterval = setInterval(() => {
      this.sendPendingReminders();
    }, intervalMs);
    
    logger.info(`Reminders sending started (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Остановить автоматическую отправку напоминаний
   */
  stopRemindersSending(): void {
    if (this.remindersInterval) {
      clearInterval(this.remindersInterval);
      this.remindersInterval = null;
      logger.info("Reminders sending stopped");
    }
  }

  /**
   * Отправить все ожидающие напоминания
   */
  private async sendPendingReminders(): Promise<void> {
    try {
      const now = new Date();
      const reminders = await repositories.reminder.findPending(now);
      
      if (reminders.length === 0) {
        return;
      }

      logger.info(`Sending ${reminders.length} pending reminders...`);

      const botService = getTelegramBotService();
      if (!botService) {
        logger.warn("Telegram bot service not available, skipping reminder sending");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const reminder of reminders) {
        try {
          // Проверяем наличие telegram_user_id у сотрудника
          if (!reminder.employee?.telegram_user_id) {
            logger.debug(`Employee ${reminder.employee_id} has no telegram_user_id, skipping reminder`, {
              reminderId: reminder.id,
              employeeId: reminder.employee_id,
            });
            // Пропускаем напоминание, но не помечаем как отправленное
            continue;
          }

          // Преобразуем telegram_user_id в number (chat_id)
          const chatId = parseInt(reminder.employee.telegram_user_id, 10);
          if (isNaN(chatId)) {
            logger.warn(`Invalid telegram_user_id format for employee ${reminder.employee_id}`, {
              reminderId: reminder.id,
              telegramUserId: reminder.employee.telegram_user_id,
            });
            errorCount++;
            continue;
          }

          // Формируем сообщение на основе типа напоминания
          const message = this.formatReminderMessage(reminder.type, reminder.employee.full_name);

          // Отправляем сообщение через Telegram
          const sent = await botService.sendMessage(chatId, message);
          
          if (sent) {
            // Помечаем как отправленное только если отправка успешна
            await repositories.reminder.markAsSent(reminder.id);
            successCount++;
            logger.info(`Reminder sent successfully: ${reminder.type} to employee ${reminder.employee.full_name} (${reminder.employee_id})`, {
              reminderId: reminder.id,
              chatId,
              type: reminder.type,
            });
          } else {
            errorCount++;
            logger.error(`Failed to send reminder ${reminder.id} via Telegram`, {
              reminderId: reminder.id,
              employeeId: reminder.employee_id,
              chatId,
              type: reminder.type,
            });
          }
        } catch (error) {
          errorCount++;
          logger.error(`Error sending reminder ${reminder.id}`, error, {
            reminderId: reminder.id,
            employeeId: reminder.employee_id,
            type: reminder.type,
          });
        }
      }

      logger.info(`Reminders sending completed: ${successCount} sent, ${errorCount} failed out of ${reminders.length} total`);
    } catch (error) {
      logger.error("Error sending pending reminders", error);
    }
  }

  /**
   * Форматирует сообщение напоминания на основе типа
   */
  private formatReminderMessage(type: string, employeeName: string): string {
    const messages: Record<string, string> = {
      "shift_start": `🔔 Напоминание: ${employeeName}, пора начинать смену!`,
      "break_end": `🔔 Напоминание: ${employeeName}, пора заканчивать перерыв!`,
      "shift_end": `🔔 Напоминание: ${employeeName}, пора завершать смену!`,
      "custom": `🔔 Напоминание для ${employeeName}`,
    };

    return messages[type] || messages["custom"];
  }

  /**
   * Запустить все scheduled задачи
   */
  startAll(): void {
    this.startShiftMonitoring(5); // Каждые 5 минут
    this.startRemindersSending(1); // Каждую минуту
    logger.info("All schedulers started");
  }

  /**
   * Остановить все scheduled задачи
   */
  stopAll(): void {
    this.stopShiftMonitoring();
    this.stopRemindersSending();
    logger.info("All schedulers stopped");
  }
}

// Singleton instance
export const scheduler = new Scheduler();

