/**
 * Cron Jobs endpoints for Vercel Cron Jobs
 * These endpoints are called by Vercel Cron Jobs to replace the scheduler functionality
 */

import { Router, type Request, type Response } from "express";
import { shiftMonitor } from "../services/shiftMonitor.js";
import { repositories } from "../repositories/index.js";
import { logger } from "../lib/logger.js";
import { getTelegramBotService } from "../services/telegramBot.js";
import { asyncHandler } from "../lib/errorHandler.js";
import { getSecret } from "../lib/secrets.js";

const router = Router();

/**
 * Verify that the request is from Vercel Cron Jobs
 * Vercel sends a special header: "Authorization: Bearer <secret>"
 */
function verifyCronRequest(req: Request): boolean {
  const authHeader = req.headers.authorization;
  const cronSecret = getSecret("CRON_SECRET");
  
  // If CRON_SECRET is not set, allow all requests (for development)
  if (!cronSecret) {
    logger.warn("CRON_SECRET not set - allowing all cron requests (development mode)");
    return true;
  }
  
  // Check if Authorization header matches CRON_SECRET
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  
  // Also check for Vercel's automatic cron secret (if available)
  const vercelCronSecret = process.env.CRON_SECRET;
  if (vercelCronSecret && authHeader === `Bearer ${vercelCronSecret}`) {
    return true;
  }
  
  logger.warn("Unauthorized cron request", {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 10),
  });
  
  return false;
}

/**
 * GET /api/cron/shift-monitoring
 * Runs shift monitoring (called every 5 minutes by Vercel Cron)
 */
router.get(
  "/shift-monitoring",
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyCronRequest(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      logger.info("Running shift monitoring via Vercel Cron Job");
      const result = await shiftMonitor.runGlobalMonitoring();
      
      logger.info("Shift monitoring completed via cron", {
        companiesProcessed: result.companiesProcessed,
        totalViolations: result.totalViolations,
        totalExceptions: result.totalExceptions,
      });
      
      return res.status(200).json({
        success: true,
        result: {
          companiesProcessed: result.companiesProcessed,
          totalViolations: result.totalViolations,
          totalExceptions: result.totalExceptions,
        },
      });
    } catch (error) {
      logger.error("Error running shift monitoring via cron", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

/**
 * GET /api/cron/reminders
 * Sends pending reminders (called every minute by Vercel Cron)
 */
router.get(
  "/reminders",
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyCronRequest(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const now = new Date();
      const reminders = await repositories.reminder.findPending(now);
      
      if (reminders.length === 0) {
        logger.info("No pending reminders to send");
        return res.status(200).json({
          success: true,
          sent: 0,
          skipped: 0,
          errors: 0,
        });
      }
      
      logger.info(`Sending ${reminders.length} pending reminders via Vercel Cron Job`);
      
      const botService = getTelegramBotService();
      if (!botService) {
        logger.warn("Telegram bot service not available, skipping reminder sending");
        return res.status(503).json({
          success: false,
          error: "Telegram bot service not available",
        });
      }
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      for (const reminder of reminders) {
        try {
          // Проверяем наличие telegram_user_id у сотрудника
          if (!reminder.employee?.telegram_user_id) {
            logger.debug(`Employee ${reminder.employee_id} has no telegram_user_id, skipping reminder`, {
              reminderId: reminder.id,
              employeeId: reminder.employee_id,
            });
            skippedCount++;
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
          const message = formatReminderMessage(reminder.type, reminder.employee.full_name);
          
          // Отправляем сообщение через Telegram
          const sent = await botService.sendMessage(chatId, message);
          
          if (sent) {
            // Помечаем как отправленное только если отправка успешна
            await repositories.reminder.markAsSent(reminder.id);
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          logger.error(`Error sending reminder ${reminder.id}`, error);
          errorCount++;
        }
      }
      
      logger.info(`Reminders sending completed via cron: ${successCount} sent, ${skippedCount} skipped, ${errorCount} errors`);
      
      return res.status(200).json({
        success: true,
        sent: successCount,
        skipped: skippedCount,
        errors: errorCount,
        total: reminders.length,
      });
    } catch (error) {
      logger.error("Error sending reminders via cron", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

/**
 * Format reminder message based on type
 */
function formatReminderMessage(type: string, employeeName: string): string {
  switch (type) {
    case "shift_start":
      return `👋 ${employeeName}, пора начинать смену!`;
    case "shift_end":
      return `👋 ${employeeName}, пора заканчивать смену!`;
    case "break_start":
      return `☕ ${employeeName}, время обеденного перерыва!`;
    case "break_end":
      return `⏰ ${employeeName}, пора возвращаться с перерыва!`;
    default:
      return `⏰ ${employeeName}, напоминание!`;
  }
}

export default router;

