// Скрипт для проверки настройки переменных окружения
// Запуск: node verify_env_setup.js

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

async function checkFrontend() {
  console.log('🔍 Проверка фронтенда...');
  
  try {
    // Проверяем что сайт открывается
    const response = await fetch('https://timeout-lac.vercel.app/');
    console.log(`📊 Статус сайта: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Сайт доступен');
      
      // Проверяем отсутствие ошибок в консоли (косвенно)
      console.log('💡 Откройте DevTools в браузере и проверьте консоль на наличие ошибок:');
      console.log('   - supabaseUrl is required');
      console.log('   - supabaseAnonKey is required');
      
    } else {
      console.log('❌ Сайт недоступен');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке сайта:', error.message);
  }
}

function checkEnvVars() {
  console.log('\n📋 Проверка переменных окружения в Vercel:');
  console.log('Зайдите в Vercel Dashboard → Settings → Environment Variables');
  console.log('Убедитесь что добавлены следующие переменные:\n');
  
  REQUIRED_VARS.forEach((varName, index) => {
    console.log(`${index + 1}. ${varName}`);
  });
  
  console.log('\n🔧 После добавления переменных:');
  console.log('1. Перейдите во вкладку Deployments');
  console.log('2. Нажмите Redeploy для последнего деплоя');
  console.log('3. Дождитесь завершения нового деплоя');
}

async function main() {
  console.log('🚀 Проверка настройки проекта\n');
  
  await checkFrontend();
  checkEnvVars();
  
  console.log('\n🎯 Следующие шаги:');
  console.log('1. Добавьте переменные окружения в Vercel (см. выше)');
  console.log('2. Перезапустите деплой');
  console.log('3. Проверьте что ошибка в консоли исчезла');
}

main().catch(console.error);