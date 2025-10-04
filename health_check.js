// Скрипт для проверки состояния проекта
// Запуск: node health_check.js

const SITE_URL = 'https://timeout-lac.vercel.app';

async function checkSiteHealth() {
  console.log('🔍 Проверка состояния сайта...\n');
  
  try {
    // Проверка главной страницы
    console.log('📡 Проверка доступности сайта...');
    const siteResponse = await fetch(SITE_URL);
    console.log(`   Статус: ${siteResponse.status} ${siteResponse.statusText}`);
    
    if (siteResponse.status === 200) {
      console.log('   ✅ Сайт доступен');
    } else {
      console.log('   ❌ Сайт недоступен');
      return false;
    }
    
    // Проверка API
    console.log('\n📡 Проверка API endpoints...');
    
    const apiEndpoints = [
      '/api/companies',
      '/api/employees',
      '/api/auth/register'
    ];
    
    let allApiOk = true;
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`${SITE_URL}${endpoint}`, {
          method: 'OPTIONS' // Используем OPTIONS чтобы не создавать данные
        });
        
        console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.status >= 500) {
          allApiOk = false;
        }
      } catch (error) {
        console.log(`   ${endpoint}: ❌ Ошибка - ${error.message}`);
        allApiOk = false;
      }
    }
    
    if (allApiOk) {
      console.log('   ✅ Все API endpoints доступны');
    } else {
      console.log('   ⚠️  Некоторые API endpoints недоступны');
    }
    
    return siteResponse.status === 200 && allApiOk;
    
  } catch (error) {
    console.error('❌ Ошибка при проверке сайта:', error.message);
    return false;
  }
}

async function checkEnvironment() {
  console.log('\n\n🔧 Проверка переменных окружения...\n');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  let allEnvOk = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ${varName}: ✅ Установлена`);
    } else {
      console.log(`   ${varName}: ❌ Отсутствует`);
      allEnvOk = false;
    }
  }
  
  return allEnvOk;
}

async function main() {
  console.log(`🚀 Health Check для ${SITE_URL}\n`);
  console.log('=' .repeat(50));
  
  const siteOk = await checkSiteHealth();
  const envOk = await checkEnvironment();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
  
  if (siteOk) {
    console.log('✅ Сайт работает корректно');
  } else {
    console.log('❌ Проблемы с доступностью сайта');
  }
  
  if (envOk) {
    console.log('✅ Все переменные окружения установлены');
  } else {
    console.log('❌ Некоторые переменные окружения отсутствуют');
  }
  
  if (siteOk && envOk) {
    console.log('\n🎉 Проект работает исправно!');
    console.log('💡 Готов к использованию в продакшене');
  } else {
    console.log('\n🔧 Требуется дополнительная настройка');
  }
}

main().catch(console.error);