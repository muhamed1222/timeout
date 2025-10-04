// Мониторинг статуса деплоя Vercel
// Запуск: node monitor_deploy.js

const DEPLOY_URL = 'https://timeout-ci9enz2qx-outtime.vercel.app'

async function checkDeployment() {
  console.log('🔍 Мониторинг деплоя...')
  console.log(`🔗 URL: ${DEPLOY_URL}`)
  
  try {
    // Проверяем главную страницу
    const response = await fetch(DEPLOY_URL, {
      redirect: 'manual' // Не следовать редиректам
    })
    
    const status = response.status
    const contentType = response.headers.get('content-type')
    
    console.log(`📊 Статус: ${status} ${response.statusText}`)
    
    if (status === 200) {
      if (contentType && contentType.includes('text/html')) {
        console.log('✅ Деплой успешен! Получена HTML страница')
        return true
      } else {
        console.log(`⚠️ Неожиданный тип контента: ${contentType}`)
      }
    } else if (status === 401) {
      console.log('🔒 Требуется аутентификация (Vercel Protection)')
    } else if (status === 404) {
      console.log('❌ Страница не найдена')
    } else {
      console.log(`❌ Неожиданный статус: ${status}`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message)
  }
  
  return false
}

async function monitorUntilSuccess() {
  const maxAttempts = 30 // Максимум 30 попыток (15 минут)
  let attempts = 0
  
  while (attempts < maxAttempts) {
    attempts++
    console.log(`\n🔄 Попытка ${attempts}/${maxAttempts}...`)
    
    const success = await checkDeployment()
    if (success) {
      console.log('\n🎉 Деплой успешно завершен!')
      return
    }
    
    // Ждем 30 секунд перед следующей попыткой
    console.log('⏳ Ждем 30 секунд перед следующей проверкой...')
    await new Promise(resolve => setTimeout(resolve, 30000))
  }
  
  console.log('\n⏰ Превышено максимальное количество попыток')
  console.log('🔧 Проверьте статус деплоя в Vercel Dashboard')
}

// Запуск мониторинга
monitorUntilSuccess().catch(console.error)