// Тестирование локального API
// Запуск: node test_local_api.js

async function testApi() {
  console.log('🚀 Тестирование локального API...\n');
  
  try {
    // Тест 1: Получение списка компаний
    console.log('📡 Тест 1: Получение списка компаний');
    const companiesResponse = await fetch('http://localhost:3001/api/companies');
    console.log(`   Статус: ${companiesResponse.status} ${companiesResponse.statusText}`);
    
    if (companiesResponse.status === 200) {
      const companies = await companiesResponse.json();
      console.log(`   Результат: ${Array.isArray(companies) ? `Получено ${companies.length} компаний` : 'Данные получены'}`);
    }
    
    // Тест 2: Регистрация
    console.log('\n📡 Тест 2: Регистрация администратора');
    const registerData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      company_name: 'Тестовая компания',
      full_name: 'Тестовый Админ'
    };
    
    const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData)
    });
    
    console.log(`   Статус: ${registerResponse.status} ${registerResponse.statusText}`);
    
    if (registerResponse.status === 200) {
      const result = await registerResponse.json();
      console.log('   ✅ Регистрация успешна!');
      console.log(`   Company ID: ${result.company_id}`);
    } else {
      const error = await registerResponse.text();
      console.log(`   ❌ Ошибка: ${error}`);
    }
    
    // Тест 3: Получение статистики (если есть companyId)
    console.log('\n📡 Тест 3: Получение статистики компании');
    // Сначала получим список компаний
    const companiesResp = await fetch('http://localhost:3001/api/companies');
    if (companiesResp.status === 200) {
      const companies = await companiesResp.json();
      if (companies.length > 0) {
        const companyId = companies[0].id;
        const statsResponse = await fetch(`http://localhost:3001/api/companies/${companyId}/stats`);
        console.log(`   Статус: ${statsResponse.status} ${statsResponse.statusText}`);
        
        if (statsResponse.status === 200) {
          const stats = await statsResponse.json();
          console.log('   ✅ Статистика получена:');
          console.log(`      Всего сотрудников: ${stats.totalEmployees}`);
          console.log(`      Активных смен: ${stats.activeShifts}`);
        }
      } else {
        console.log('   ⚠️  Нет компаний для тестирования');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);
  }
  
  console.log('\n🏁 Тестирование завершено');
}

testApi().catch(console.error);