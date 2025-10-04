// Скрипт для тестирования регистрации
// Запуск: node test_registration.js

const API_BASE = 'https://timeout-lac.vercel.app';

async function testRegistration() {
  console.log('🚀 Тестирование регистрации...\n');
  
  // Тестовые данные для регистрации
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    company_name: 'Тестовая компания',
    full_name: 'Тестовый Пользователь'
  };
  
  console.log('📝 Отправляемые данные:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    console.log('\n📡 Отправка запроса на регистрацию...');
    
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`📊 Статус ответа: ${status} ${statusText}`);
    
    // Получаем тело ответа
    const responseBody = await response.text();
    let jsonData = null;
    
    try {
      jsonData = JSON.parse(responseBody);
      console.log('📦 Ответ (JSON):');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('📄 Ответ (текст):');
      console.log(responseBody.substring(0, 500) + (responseBody.length > 500 ? '...' : ''));
    }
    
    // Анализ результата
    if (status === 200) {
      console.log('\n✅ Регистрация успешна!');
      console.log('💡 Сохраните эти данные для входа:');
      console.log(`   Email: ${testData.email}`);
      console.log(`   Пароль: ${testData.password}`);
      
      if (jsonData && jsonData.company_id) {
        console.log(`   Company ID: ${jsonData.company_id}`);
      }
      
    } else if (status === 400) {
      console.log('\n⚠️  Ошибка валидации данных');
      if (jsonData && jsonData.error) {
        console.log(`   Сообщение: ${jsonData.error}`);
      }
      
    } else if (status === 500) {
      console.log('\n❌ Внутренняя ошибка сервера (500)');
      console.log('🔧 Возможные причины:');
      console.log('   - Проблемы с подключением к базе данных');
      console.log('   - Неправильные переменные окружения');
      console.log('   - Ошибки в коде обработки регистрации');
      
    } else {
      console.log(`\n❓ Неожиданный статус: ${status}`);
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка при отправке запроса:', error.message);
    console.log('🔧 Проверьте:');
    console.log('   - Доступность сайта');
    console.log('   - Правильность URL');
    console.log('   - Подключение к интернету');
  }
}

// Тест входа в систему
async function testLogin() {
  console.log('\n\n🔐 Тестирование входа...\n');
  
  // Здесь можно добавить тест входа после успешной регистрации
  console.log('💡 После регистрации попробуйте войти через интерфейс сайта');
}

// Основная функция
async function main() {
  console.log(`📍 Тестируем API: ${API_BASE}`);
  
  await testRegistration();
  await testLogin();
  
  console.log('\n🏁 Тестирование завершено');
}

main().catch(console.error);