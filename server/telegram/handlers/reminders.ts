import { repositories } from "../../repositories/index.js";
import { logger } from "../../lib/logger.js";

export async function sendShiftReminder(employeeId: string, message: string) {
  try {
    const employee = await repositories.employee.findById(employeeId);
    if (!employee?.telegram_user_id) {
      logger.debug("No telegram ID for employee", { employeeId });
      return;
    }

    // Здесь должен быть код для отправки сообщения через бота
    // В реальной реализации нужно использовать экземпляр бота
    logger.info("Sending reminder to employee", { telegramUserId: employee.telegram_user_id, message });
    
  } catch (error) {
    logger.error("Error sending reminder", error, { employeeId });
  }
}

export async function sendShiftStartReminder() {
  try {
    // Получаем всех сотрудников с запланированными сменами на сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Здесь нужно реализовать логику получения сотрудников с сменами
    // и отправки им напоминаний за 10 минут до начала смены
    
    logger.info("Sending shift start reminders");
    
  } catch (error) {
    logger.error("Error sending shift start reminders", error);
  }
}

export async function sendShiftEndReminder() {
  try {
    // Получаем всех сотрудников с активными сменами
    // и отправляем им напоминание о завершении смены
    
    logger.info("Sending shift end reminders");
    
  } catch (error) {
    logger.error("Error sending shift end reminders", error);
  }
}
