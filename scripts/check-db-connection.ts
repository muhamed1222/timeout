#!/usr/bin/env tsx
/**
 * Скрипт для проверки подключения к базе данных
 * Использование: npx tsx scripts/check-db-connection.ts
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не установлен');
  console.error('Установите переменную окружения:');
  console.error('export DATABASE_URL="postgresql://..."');
  process.exit(1);
}

async function checkConnection() {
  console.log('🔍 Проверка подключения к базе данных...\n');
  
  try {
    const client = postgres(connectionString, {
      ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    
    const db = drizzle(client, { schema });
    
    // Проверка подключения
    console.log('1. Проверка подключения...');
    await client`SELECT 1`;
    console.log('   ✅ Подключение успешно\n');
    
    // Проверка таблиц
    console.log('2. Проверка наличия таблиц...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const expectedTables = [
      'company',
      'employee',
      'shift',
      'work_interval',
      'break_interval',
      'daily_report',
      'exception',
      'reminder',
      'schedule_template',
      'employee_invite',
      'audit_log',
      'company_violation_rules',
      'violations',
      'employee_rating',
    ];
    
    const foundTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('   ⚠️  Отсутствуют таблицы:', missingTables.join(', '));
      console.log('   💡 Выполните миграции: npm run db:push\n');
    } else {
      console.log('   ✅ Все таблицы на месте\n');
    }
    
    // Проверка данных
    console.log('3. Проверка данных...');
    const companies = await db.select().from(schema.company).limit(1);
    
    if (companies.length > 0) {
      console.log(`   ✅ Найдено компаний: ${companies.length}`);
      console.log(`   📊 Пример компании: ${companies[0].name}`);
    } else {
      console.log('   ⚠️  Таблица company пуста');
      console.log('   💡 Создайте компанию через API или SQL');
    }
    
    console.log('\n✅ Все проверки пройдены!');
    await client.end();
    
  } catch (error) {
    console.error('\n❌ Ошибка подключения:');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('password authentication failed')) {
        console.error('\n💡 Проверьте пароль в DATABASE_URL');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('\n💡 Проверьте хост в DATABASE_URL');
      } else if (error.message.includes('timeout')) {
        console.error('\n💡 Проверьте сетевое соединение и доступность БД');
      }
    }
    
    process.exit(1);
  }
}

checkConnection();

