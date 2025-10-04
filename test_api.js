// Тест API endpoints
// Запуск: node test_api.js

const API_BASE = 'https://timeout-ci9enz2qx-outtime.vercel.app'

async function testEndpoint(path, description) {
  try {
    console.log(`\n🔍 Тестируем: ${description}`)
    console.log(`🔗 URL: ${API_BASE}${path}`)
    
    const response = await fetch(`${API_BASE}${path}`)
    const status = response.status
    const contentType = response.headers.get('content-type')
    
    console.log(`📊 Статус: ${status} ${response.statusText}`)
    console.log(`📄 Тип контента: ${contentType}`)
    
    if (status === 200) {
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        console.log('✅ Успех! Получены данные JSON')
        console.log('📦 Данные:', JSON.stringify(data, null, 2).slice(0, 200) + '...')
      } else {
        const text = await response.text()
        console.log('⚠️  Получен HTML вместо JSON')
        console.log('📄 Первые 200 символов:', text.slice(0, 200))
      }
    } else if (status === 401) {
      console.log('🔒 Требуется аутентификация (Vercel Protection)')
    } else if (status === 404) {
      console.log('❌ Endpoint не найден')
    } else {
      console.log(`❌ Неожиданный статус: ${status}`)
    }
    
  } catch (error) {
    console.error(`❌ Ошибка при тестировании ${description}:`, error.message)
  }
}

async function runTests() {
  console.log('🚀 Тестирование API endpoints...')
  
  await testEndpoint('/api/companies', 'Список компаний')
  await testEndpoint('/api/employees', 'Список сотрудников')
  await testEndpoint('/', 'Главная страница')
  
  console.log('\n🏁 Тестирование завершено')
}

runTests()