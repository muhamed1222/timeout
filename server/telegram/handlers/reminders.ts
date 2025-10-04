import { storage } from '../../storage';

export async function sendShiftReminder(employeeId: string, message: string) {
  try {
    const employee = await storage.getEmployee(employeeId);
    if (!employee?.telegram_user_id) {
      console.log(`No telegram ID for employee ${employeeId}`);
      return;
    }

    // Здесь должен быть код для отправки сообщения через бота
    // В реальной реализации нужно использовать экземпляр бота
    console.log(`Sending reminder to ${employee.telegram_user_id}: ${message}`);
    
  } catch (error) {
    console.error('Error sending reminder:', error);
  }
}

export async function sendShiftStartReminder() {
  try {
    // Получаем всех сотрудников с запланированными сменами на сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Здесь нужно реализовать логику получения сотрудников с сменами
    // и отправки им напоминаний за 10 минут до начала смены
    
    console.log('Sending shift start reminders...');
    
  } catch (error) {
    console.error('Error sending shift start reminders:', error);
  }
}

export async function sendShiftEndReminder() {
  try {
    // Получаем всех сотрудников с активными сменами
    // и отправляем им напоминание о завершении смены
    
    console.log('Sending shift end reminders...');
    
  } catch (error) {
    console.error('Error sending shift end reminders:', error);
  }
}
