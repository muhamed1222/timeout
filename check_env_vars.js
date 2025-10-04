// Скрипт для проверки всех необходимых переменных окружения
// Запуск: node check_env_vars.js

const REQUIRED_VARS = [
  // Frontend variables
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  
  // Backend variables
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  
  // Optional Telegram variables
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME'
];

function checkVercelEnvVars() {
  console.log('📋 Проверка переменных окружения в Vercel:\n');
  
  console.log('🔧 FRONTEND переменные (обязательные):');
  console.log('   VITE_SUPABASE_URL =', process.env.VITE_SUPABASE_URL ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   VITE_SUPABASE_ANON_KEY =', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   NEXT_PUBLIC_SUPABASE_URL =', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY =', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Установлена' : '❌ Отсутствует');
  
  console.log('\n🔧 BACKEND переменные (обязательные):');
  console.log('   SUPABASE_URL =', process.env.SUPABASE_URL ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   SUPABASE_SERVICE_ROLE_KEY =', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   DATABASE_URL =', process.env.DATABASE_URL ? '✅ Установлена' : '❌ Отсутствует');
  
  console.log('\n🔧 Дополнительные переменные:');
  console.log('   TELEGRAM_BOT_TOKEN =', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлена' : '❌ Отсутствует');
  console.log('   TELEGRAM_BOT_USERNAME =', process.env.TELEGRAM_BOT_USERNAME ? '✅ Установлена' : '❌ Отсутствует');
  
  console.log('\n📝 Инструкция по добавлению переменных:');
  console.log('1. Зайдите на vercel.com → ваш проект → Settings → Environment Variables');
  console.log('2. Добавьте все отсутствующие переменные из списка выше');
  console.log('3. Перезапустите деплой через Deployments → Redeploy');
}

// Проверим что все переменные установлены
function validateAllVars() {
  const missingVars = [];
  
  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('\n❌ Найдены отсутствующие переменные:');
    missingVars.forEach((varName, index) => {
      console.log(`   ${index + 1}. ${varName}`);
    });
    
    console.log('\n💡 Рекомендация:');
    console.log('Добавьте все отсутствующие переменные в Vercel Environment Variables');
    return false;
  } else {
    console.log('\n✅ Все переменные установлены!');
    return true;
  }
}

// Основная функция
function main() {
  console.log('🚀 Проверка переменных окружения для ShiftManager\n');
  checkVercelEnvVars();
  const isValid = validateAllVars();
  
  if (!isValid) {
    process.exit(1);
  }
}

main();