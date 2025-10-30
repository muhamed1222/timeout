import { storage } from "../storage.js";
import { getTelegramBotService } from "../services/telegramBot.js";
import { 
  TELEGRAM_MESSAGES, 
  getWebAppKeyboard 
} from "../constants/telegram.js";
import type { Employee } from "@shared/schema";
import { logger } from "../lib/logger.js";

const botService = getTelegramBotService();

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
  chatId: number, 
  text: string, 
  options?: any
): Promise<void> {
  if (!botService) {
    logger.warn('Telegram bot service not available, skipping message send');
    logger.info('[Mock] Would send to Telegram', { chatId, text, options });
    return;
  }

  await botService.sendMessage(chatId, text, options);
}

/**
 * Handle /start command with invite code
 */
export async function handleInviteCode(
  chatId: number,
  userId: number,
  inviteCode: string
): Promise<void> {
  try {
    // Check if employee with this telegram ID already exists
    let employee = await storage.getEmployeeByTelegramId(userId.toString());
    
    if (employee) {
      await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.ALREADY_LINKED);
      return;
    }
    
    // Get invite info before attempting to use it
    const invite = await storage.getEmployeeInviteByCode(inviteCode);
    
    if (!invite) {
      await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVALID_INVITE);
      return;
    }
    
    // Case 1: Invite has pre-created employee (admin provisioned)
    if (invite.used_by_employee) {
      try {
        // First, atomically claim the invite
        const usedInvite = await storage.useEmployeeInvite(inviteCode, invite.used_by_employee);
        
        if (!usedInvite) {
          // Invite already used or invalid
          await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVALID_INVITE);
          return;
        }
        
        // Now it's safe to link Telegram ID to the employee
        try {
          await storage.updateEmployee(invite.used_by_employee, {
            telegram_user_id: userId.toString()
          });
          
          employee = await storage.getEmployee(invite.used_by_employee);
          
          if (employee) {
            await sendTelegramMessage(
              chatId,
              TELEGRAM_MESSAGES.WELCOME_WITH_INVITE(employee.full_name),
              { reply_markup: getWebAppKeyboard() }
            );
          }
        } catch (updateError) {
          logger.error("Error updating employee telegram_user_id", updateError);
          
          // Check if telegram_user_id is already linked to another account
          if (updateError && typeof updateError === 'object' && 'code' in updateError && updateError.code === '23505') {
            await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.ALREADY_LINKED);
          } else {
            await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVITE_PROCESSING_ERROR);
          }
          
          // Note: Invite is now marked as used but telegram link failed
          // This is acceptable as it prevents reuse of the invite
        }
      } catch (inviteError) {
        logger.error("Error processing pre-created employee invite", inviteError);
        await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVITE_PROCESSING_ERROR);
      }
      return;
    }
    
    // Case 2: New employee needs to be created
    try {
      // Create employee
      employee = await storage.createEmployee({
        company_id: invite.company_id,
        full_name: invite.full_name || "Новый сотрудник",
        position: invite.position || undefined,
        telegram_user_id: userId.toString(),
        status: "active"
      });
      
      // Atomically mark invite as used
      const usedInvite = await storage.useEmployeeInvite(inviteCode, employee.id);
      
      if (!usedInvite) {
        // Invite was claimed by another request - rollback
        logger.error("Invite already claimed, rolling back employee creation", undefined, { employeeId: employee.id });
        
        // Clean up: we can't reliably delete the employee because it might have
        // related data, so we mark it as inactive instead
        await storage.updateEmployee(employee.id, {
          status: "inactive",
          telegram_user_id: null
        });
        
        await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVALID_INVITE);
        return;
      }
      
      // Send success message
      await sendTelegramMessage(
        chatId,
        TELEGRAM_MESSAGES.WELCOME_WITH_INVITE(employee.full_name),
        { reply_markup: getWebAppKeyboard() }
      );
    } catch (creationError) {
      logger.error("Error creating employee", creationError);
      
      // Check if telegram_user_id constraint was violated
      if (creationError && typeof creationError === 'object' && 'code' in creationError && creationError.code === '23505') {
        await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.ALREADY_LINKED);
      } else {
        await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVITE_PROCESSING_ERROR);
      }
    }
  } catch (error) {
    logger.error("Error processing invite", error);
    await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.INVITE_PROCESSING_ERROR);
  }
}

/**
 * Handle /start command without invite code
 */
export async function handleStartCommand(chatId: number): Promise<void> {
  await sendTelegramMessage(
    chatId,
    TELEGRAM_MESSAGES.WELCOME_DEFAULT,
    { reply_markup: getWebAppKeyboard() }
  );
}

/**
 * Handle /status command
 */
export async function handleStatusCommand(
  chatId: number,
  userId: number
): Promise<void> {
  const employee = await storage.getEmployeeByTelegramId(userId.toString());
  
  if (!employee) {
    await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.EMPLOYEE_NOT_FOUND);
    return;
  }
  
  const shifts = await storage.getShiftsByEmployee(employee.id);
  const activeShift = shifts.find(s => s.status === 'active');
  
  if (activeShift) {
    const startTime = new Date(activeShift.planned_start_at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(activeShift.planned_end_at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    await sendTelegramMessage(
      chatId, 
      TELEGRAM_MESSAGES.STATUS_WORKING(startTime, endTime)
    );
  } else {
    await sendTelegramMessage(chatId, TELEGRAM_MESSAGES.STATUS_OFF_WORK);
  }
}

/**
 * Main message handler - dispatches to specific handlers
 */
export async function handleTelegramMessage(message: any): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;
  
  logger.info('Received Telegram message', { userId, text });
  
  if (!text) {
    return;
  }
  
  // Handle /start command
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const inviteCode = parts[1];
    
    if (inviteCode) {
      await handleInviteCode(chatId, userId, inviteCode);
    } else {
      await handleStartCommand(chatId);
    }
    return;
  }
  
  // Handle /status command
  if (text === '/status') {
    await handleStatusCommand(chatId, userId);
    return;
  }
}
