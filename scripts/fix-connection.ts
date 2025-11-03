/**
 * Автоматическое исправление подключения к Supabase
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const currentUrl = process.env.DATABASE_URL!;
const supabaseUrl = process.env.SUPABASE_URL || '';

console.log('🔧 Автоматическое исправление подключения к Supabase...\n');

// Извлекаем project ref и пароль
const urlMatch = currentUrl.match(/postgres\.([^:]+):([^@]+)@([^/]+)/);
if (!urlMatch) {
  console.error('❌ Не удалось распарсить DATABASE_URL');
  process.exit(1);
}

const projectRef = urlMatch[1];
const password = urlMatch[2];
const host = urlMatch[3];

console.log(`Project ref: ${projectRef}`);
console.log(`Host: ${host.replace(/:[^:]*$/, ':***')}`);
console.log('');

// Варианты подключения для проверки
const connections = [
  {
    name: '1. Стандартный формат Supabase (db.{ref}.supabase.co) - ПРИОРИТЕТ',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  },
  {
    name: '2. Формат без project ref в user (postgres)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  },
  {
    name: '3. Pooler с транзакционным режимом',
    url: currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'pgbouncer=true',
  },
  {
    name: '4. Pooler без параметров',
    url: currentUrl,
  },
];

async function testConnection(name: string, url: string): Promise<boolean> {
  console.log(`🧪 Тестирую: ${name}`);
  
  const client = postgres(url, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 10,
    max: 1,
  });

  try {
    const result = await Promise.race([
      client`SELECT 1 as test, NOW() as time`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 8000),
      ),
    ]);

    console.log(`   ✅ РАБОТАЕТ! Результат:`, result);
    await client.end();
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('ENOTFOUND')) {
      console.log(`   ⏭️  Хост не найден, пропускаю...`);
    } else {
      console.log(`   ❌ Не работает: ${errorMsg.substring(0, 50)}`);
    }
    try {
      await client.end();
    } catch {
      // Ignore
    }
    return false;
  }
}

// Также пробуем получить connection string из Supabase REST API
async function tryGetFromAPI(): Promise<string | null> {
  if (!supabaseUrl) return null;
  
  try {
    // Пробуем стандартный формат Supabase
    const apiUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(apiUrl, {
      method: 'HEAD',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || '',
      },
    });
    
    if (response.ok) {
      // Если API доступен, пробуем стандартный формат
      return `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres`;
    }
  } catch (error) {
    // Ignore
  }
  
  return null;
}

(async () => {
  // Сначала пробуем получить из API
  const apiUrl = await tryGetFromAPI();
  if (apiUrl) {
    connections.unshift({
      name: '0. Из API (стандартный формат)',
      url: apiUrl,
    });
  }

  let workingUrl: string | null = null;

  for (const conn of connections) {
    const success = await testConnection(conn.name, conn.url);
    if (success) {
      workingUrl = conn.url;
      break;
    }
  }

  if (workingUrl) {
    console.log(`\n✅ НАЙДЕНО РАБОЧЕЕ ПОДКЛЮЧЕНИЕ!\n`);
    
    // Обновляем .env
    let envContent = fs.readFileSync('.env', 'utf8');
    const oldUrl = envContent.match(/^DATABASE_URL=(.+)$/m)?.[1];
    
    if (oldUrl !== workingUrl) {
      envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${workingUrl}`);
      fs.writeFileSync('.env', envContent);
      console.log('✅ DATABASE_URL автоматически обновлен в .env!');
      console.log(`\nСтарый: ${oldUrl?.replace(/:[^:@]*@/, ':***@')}`);
      console.log(`Новый: ${workingUrl.replace(/:[^:@]*@/, ':***@')}`);
      console.log('\n🔄 Перезапустите сервер: npm run dev\n');
    } else {
      console.log('ℹ️  DATABASE_URL уже настроен правильно\n');
    }
    process.exit(0);
  }

  console.log('\n❌ Автоматическое исправление не удалось');
  console.log('\n📝 Нужно получить Connection String вручную:');
  console.log('1. https://supabase.com/dashboard');
  console.log('2. Проект → Settings → Database');
  console.log('3. Connection string → Direct connection');
  console.log('4. Скопируйте и обновите .env вручную');
  process.exit(1);
})();

