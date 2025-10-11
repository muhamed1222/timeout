import 'dotenv/config';
import { storage } from '../server/storage';

async function main() {
  const telegramId = process.argv[2];
  const companyId = process.argv[3];
  const fullName = process.argv[4] || 'Сотрудник';
  const position = process.argv[5] || 'Сотрудник';

  if (!telegramId || !companyId) {
    console.error('Usage: tsx scripts/force-link-employee.ts <telegramId> <companyId> [fullName] [position]');
    process.exit(1);
  }

  const existing = await storage.getEmployeeByTelegramId(telegramId);
  if (existing) {
    const updated = await storage.updateEmployee(existing.id, {
      company_id: companyId,
      full_name: fullName || existing.full_name,
      position: position || existing.position,
      telegram_user_id: telegramId,
      status: 'active'
    });
    console.log('Updated employee:', updated);
  } else {
    const created = await storage.createEmployee({
      company_id: companyId,
      full_name: fullName,
      position,
      telegram_user_id: telegramId,
      status: 'active'
    });
    console.log('Created employee:', created);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
