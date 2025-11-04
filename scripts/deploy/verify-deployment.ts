#!/usr/bin/env tsx
/**
 * Комплексная проверка готовности к деплою
 * Использование: npx tsx scripts/verify-deployment.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 Проверка готовности к деплою\n');
console.log('='.repeat(50));
console.log('');

// 1. Проверка файлов
console.log('1️⃣  Проверка файлов конфигурации...');
const vercelJson = existsSync('vercel.json');
const packageJson = existsSync('package.json');

if (vercelJson) {
  console.log('   ✅ vercel.json найден');
  try {
    const config = JSON.parse(readFileSync('vercel.json', 'utf-8'));
    if (config.buildCommand) {
      console.log(`   ✅ buildCommand: ${config.buildCommand}`);
    }
    if (config.outputDirectory) {
      console.log(`   ✅ outputDirectory: ${config.outputDirectory}`);
    }
  } catch (e) {
    console.log('   ⚠️  Ошибка чтения vercel.json');
  }
} else {
  console.log('   ❌ vercel.json не найден');
}

if (packageJson) {
  console.log('   ✅ package.json найден');
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    if (pkg.scripts && pkg.scripts['build:vercel']) {
      console.log(`   ✅ Скрипт build:vercel найден`);
    }
  } catch (e) {
    console.log('   ⚠️  Ошибка чтения package.json');
  }
}

console.log('');

// 2. Проверка переменных окружения
console.log('2️⃣  Проверка переменных окружения...');

const envVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

let envOk = true;
for (const [key, value] of Object.entries(envVars)) {
  if (key === 'NODE_ENV') {
    console.log(`   ${value ? '✅' : '⚠️'} ${key}=${value || 'не установлено'}`);
    continue;
  }
  
  if (value) {
    const masked = key.includes('KEY') || key.includes('TOKEN') || key.includes('PASSWORD')
      ? `${value.substring(0, 15)}...`
      : value;
    console.log(`   ✅ ${key}=${masked}`);
  } else {
    console.log(`   ❌ ${key} - не установлено`);
    envOk = false;
  }
}

console.log('');

// 3. Проверка DATABASE_URL формата
console.log('3️⃣  Проверка формата DATABASE_URL...');
if (envVars.DATABASE_URL) {
  const dbUrl = envVars.DATABASE_URL;
  if (dbUrl.startsWith('postgresql://')) {
    console.log('   ✅ Формат PostgreSQL корректный');
    
    // Проверка на Supabase
    if (dbUrl.includes('supabase') || dbUrl.includes('pooler.supabase.com')) {
      console.log('   ✅ Обнаружен Supabase');
      
      if (dbUrl.includes(':6543')) {
        console.log('   ✅ Используется Connection Pooler (рекомендуется)');
      }
    }
  } else {
    console.log('   ⚠️  Нестандартный формат DATABASE_URL');
  }
} else {
  console.log('   ⚠️  DATABASE_URL не установлен');
}

console.log('');

// 4. Итоговый отчет
console.log('='.repeat(50));
console.log('');

if (envOk && vercelJson && packageJson) {
  console.log('✅ Основные проверки пройдены!');
  console.log('');
  console.log('📋 Следующие шаги:');
  console.log('   1. Убедитесь, что все переменные добавлены в Vercel');
  console.log('      Settings → Environment Variables');
  console.log('');
  console.log('   2. Проверьте переменные для Production окружения:');
  console.log('      - DATABASE_URL');
  console.log('      - SUPABASE_URL');
  console.log('      - SUPABASE_ANON_KEY');
  console.log('      - SUPABASE_SERVICE_ROLE_KEY');
  console.log('      - NODE_ENV=production');
  console.log('');
  console.log('   3. Сделайте Redeploy в Vercel после добавления переменных');
  console.log('');
  console.log('   4. Проверьте логи деплоя на предмет ошибок');
  console.log('');
} else {
  console.log('❌ Обнаружены проблемы!');
  console.log('');
  console.log('💡 Рекомендации:');
  if (!envOk) {
    console.log('   - Установите все обязательные переменные окружения');
  }
  if (!vercelJson) {
    console.log('   - Создайте vercel.json для конфигурации');
  }
  console.log('');
  process.exit(1);
}

