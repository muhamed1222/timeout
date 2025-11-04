#!/usr/bin/env tsx
/**
 * Скрипт для проверки переменных окружения, необходимых для Vercel
 * Использование: npx tsx scripts/check-vercel-env.ts
 */

console.log('🔍 Проверка переменных окружения для Vercel...\n');

const required = {
  DATABASE_URL: 'postgresql://...',
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};

const optional = {
  TELEGRAM_BOT_TOKEN: 'your-bot-token',
  TELEGRAM_BOT_USERNAME: '@your_bot',
  NODE_ENV: 'production',
};

console.log('📋 Обязательные переменные:');
let allPresent = true;

for (const [key, example] of Object.entries(required)) {
  const value = process.env[key];
  if (value) {
    const masked = key.includes('PASSWORD') || key.includes('TOKEN') || key.includes('KEY')
      ? `${value.substring(0, 10)}...` 
      : value;
    console.log(`   ✅ ${key}=${masked}`);
  } else {
    console.log(`   ❌ ${key} - отсутствует (пример: ${example})`);
    allPresent = false;
  }
}

console.log('\n📋 Опциональные переменные:');
for (const [key, example] of Object.entries(optional)) {
  const value = process.env[key];
  if (value) {
    const masked = key.includes('TOKEN') 
      ? `${value.substring(0, 10)}...` 
      : value;
    console.log(`   ✅ ${key}=${masked}`);
  } else {
    console.log(`   ⚠️  ${key} - отсутствует (пример: ${example})`);
  }
}

if (!allPresent) {
  console.log('\n❌ Некоторые обязательные переменные отсутствуют!');
  console.log('\n💡 Добавьте их в Vercel:');
  console.log('   1. Settings → Environment Variables');
  console.log('   2. Добавьте все переменные из списка выше');
  console.log('   3. Сделайте Redeploy\n');
  process.exit(1);
} else {
  console.log('\n✅ Все обязательные переменные установлены!');
}

