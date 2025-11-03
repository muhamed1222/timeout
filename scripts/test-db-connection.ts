/**
 * Test Supabase database connection with different configurations
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const currentUrl = process.env.DATABASE_URL;
if (!currentUrl) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

// Extract password and project ref from current URL
const urlMatch = currentUrl.match(/postgres\.([^:]+):([^@]+)@/);
const projectRef = urlMatch ? urlMatch[1] : 'chkziqbxvdzwhlucfrza';
const password = urlMatch ? urlMatch[2] : '';

// Build base URL
const baseUrl = currentUrl;

// Строим варианты прямого подключения
// Формат 1: db.{ref}.supabase.co (новый формат)
const directUrl1 = `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres`;
// Формат 2: aws-1-eu-west-2.supabase.co (старый формат, как в pooler)
const directUrl2 = baseUrl.replace('pooler.supabase.com:6543', 'supabase.co:5432');

const connections = [
  {
    name: '1. Прямое подключение через aws-1-eu-west-2 (из текущего URL)',
    url: directUrl2,
  },
  {
    name: '2. Прямое подключение db.{ref}.supabase.co',
    url: directUrl1,
  },
  {
    name: '3. Прямое подключение с SSL параметрами',
    url: directUrl2 + '?sslmode=require',
  },
  {
    name: '4. Pooler транзакционный режим',
    url: baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'pgbouncer=true&sslmode=require',
  },
];

async function testConnection(name: string, url: string): Promise<boolean> {
  console.log(`\n🧪 Тестирую: ${name}`);
  console.log(`   URL: ${url.replace(/:[^:@]*@/, ':***@')}`);

  const client = postgres(url, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 10, // Увеличил таймаут до 10 секунд
    max: 1,
    idle_timeout: 20,
  });

  try {
    const result = await Promise.race([
      client`SELECT 1 as test, NOW() as time`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000),
      ),
    ]);

    console.log(`   ✅ УСПЕХ! Результат:`, result);
    await client.end();
    return true;
  } catch (error) {
    console.log(
      `   ❌ ОШИБКА: ${error instanceof Error ? error.message : String(error)}`,
    );
    try {
      await client.end();
    } catch {
      // Ignore
    }
    return false;
  }
}

(async () => {
  console.log('🔍 Поиск рабочего подключения к Supabase...\n');
  console.log(`Текущий URL: ${currentUrl.replace(/:[^:@]*@/, ':***@')}\n`);

  let workingUrl: string | null = null;

  for (const conn of connections) {
    const success = await testConnection(conn.name, conn.url);
    if (success) {
      console.log(`\n✅ НАЙДЕНО РАБОЧЕЕ ПОДКЛЮЧЕНИЕ!\n`);
      workingUrl = conn.url;
      break;
    }
  }

  if (workingUrl) {
    // Автоматически обновляем .env
    const fs = await import('fs');
    let envContent = fs.readFileSync('.env', 'utf8');
    const oldUrl = envContent.match(/^DATABASE_URL=(.+)$/m)?.[1];
    
    if (oldUrl !== workingUrl) {
      envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${workingUrl}`);
      fs.writeFileSync('.env', envContent);
      console.log('✅ DATABASE_URL автоматически обновлен в .env!');
      console.log(`\nСтарый URL: ${oldUrl?.replace(/:[^:@]*@/, ':***@')}`);
      console.log(`Новый URL: ${workingUrl.replace(/:[^:@]*@/, ':***@')}`);
      console.log('\n🔄 Перезапустите сервер: npm run dev\n');
    } else {
      console.log('ℹ️  DATABASE_URL уже настроен правильно\n');
    }
    process.exit(0);
  }

  console.log('\n❌ Все варианты подключения не сработали');
  console.log('\nВозможные причины:');
  console.log('1. IP адрес заблокирован в Supabase Dashboard');
  console.log('2. Неправильный пароль базы данных');
  console.log('3. Проект Supabase приостановлен или удален');
  console.log('4. Проблемы с сетью/файрволлом');
  console.log('5. Превышен лимит соединений');
  console.log('\nРешения:');
  console.log('- Проверьте Supabase Dashboard → Settings → Database');
  console.log('- Проверьте Connection Pooling → Allowed IP addresses');
  console.log('- Попробуйте сбросить пароль базы данных');
  console.log('- Проверьте статус проекта в Supabase Dashboard');
  process.exit(1);
})();

