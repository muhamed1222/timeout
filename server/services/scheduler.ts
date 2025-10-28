/**
 * Scheduler Service - Автоматическое выполнение задач по расписанию
 */

import { shiftMonitor } from "./shiftMonitor.js";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";

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
      const reminders = await storage.getPendingReminders(now);
      
      if (reminders.length === 0) {
        return;
      }

      logger.info(`Sending ${reminders.length} pending reminders...`);

      for (const reminder of reminders) {
        try {
          // TODO: Implement actual reminder sending via Telegram
          // For now just mark as sent
          await storage.markReminderSent(reminder.id);
          logger.info(`Reminder sent: ${reminder.type} to employee ${reminder.employee_id}`);
        } catch (error) {
          logger.error(`Failed to send reminder ${reminder.id}`, error);
        }
      }

      logger.info(`Sent ${reminders.length} reminders`);
    } catch (error) {
      logger.error("Error sending pending reminders", error);
    }
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

