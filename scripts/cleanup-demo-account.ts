import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';

// Импортируем схему напрямую
import { company, employee, shift, daily_report, employee_invite } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function cleanupDemoAccount() {
  try {
    console.log('🔍 Поиск demo компании...');
    
    // Найдем компанию по имени (demo компании обычно имеют определенные имена)
    const companies = await db.select().from(company)
      .where(eq(company.name, 'ООО Компания')); // Или другое имя demo компании
    
    if (companies.length === 0) {
      console.log('❌ Demo компания не найдена');
      console.log('📋 Доступные компании:');
      const allCompanies = await db.select().from(company);
      allCompanies.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name} (ID: ${comp.id})`);
      });
      return;
    }
    
    const companyData = companies[0];
    console.log(`✅ Найдена компания: ${companyData.name} (ID: ${companyData.id})`);
    
    // Получим всех сотрудников компании
    const employees = await db.select().from(employee)
      .where(eq(employee.company_id, companyData.id));
    
    console.log(`📊 Найдено сотрудников: ${employees.length}`);
    
    if (employees.length === 0) {
      console.log('✅ Сотрудников для удаления нет');
      return;
    }
    
    // Покажем список сотрудников
    console.log('\n📋 Список сотрудников для удаления:');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.full_name} (${emp.position}) - Telegram: ${emp.telegram_user_id || 'не подключен'}`);
    });
    
    // Удалим все связанные данные
    console.log('\n🗑️ Удаление связанных данных...');
    
    // 1. Удалим отчеты
    const reports = await db.select().from(daily_report)
      .innerJoin(shift, eq(daily_report.shift_id, shift.id))
      .innerJoin(employee, eq(shift.employee_id, employee.id))
      .where(eq(employee.company_id, companyData.id));
    
    if (reports.length > 0) {
      const reportIds = reports.map(r => r.daily_report.id);
      await db.delete(daily_report).where(
        inArray(daily_report.id, reportIds)
      );
      console.log(`✅ Удалено отчетов: ${reports.length}`);
    }
    
    // 2. Удалим смены
    const shifts = await db.select().from(shift)
      .innerJoin(employee, eq(shift.employee_id, employee.id))
      .where(eq(employee.company_id, companyData.id));
    
    if (shifts.length > 0) {
      const shiftIds = shifts.map(s => s.shift.id);
      await db.delete(shift).where(
        inArray(shift.id, shiftIds)
      );
      console.log(`✅ Удалено смен: ${shifts.length}`);
    }
    
    // 3. Удалим приглашения
    const invites = await db.select().from(employee_invite)
      .where(eq(employee_invite.company_id, companyData.id));
    
    if (invites.length > 0) {
      await db.delete(employee_invite).where(
        eq(employee_invite.company_id, companyData.id)
      );
      console.log(`✅ Удалено приглашений: ${invites.length}`);
    }
    
    // 4. Удалим сотрудников
    await db.delete(employee).where(
      eq(employee.company_id, companyData.id)
    );
    console.log(`✅ Удалено сотрудников: ${employees.length}`);
    
    console.log('\n🎉 Очистка завершена! Demo компания теперь пустая.');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
  } finally {
    await client.end();
  }
}

cleanupDemoAccount();
