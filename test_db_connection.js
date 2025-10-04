// Тест подключения к базе данных Supabase
// Запуск: node test_db_connection.js

import { createClient } from '@supabase/supabase-js'

// Получаем переменные из окружения
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('🔍 Тест подключения к Supabase...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? '✓ Установлен' : '❌ Не установлен')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ОШИБКА: Не все переменные окружения установлены!')
  process.exit(1)
}

// Создаем клиент
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Тестовый запрос к таблице companies (если существует)
async function testConnection() {
  try {
    console.log('\n🚀 Проверяем подключение...')
    
    // Пробуем получить список таблиц
    const { data, error } = await supabase
      .from('company')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Ошибка запроса:', error.message)
      if (error.message.includes('relation "company" does not exist')) {
        console.log('💡 Таблицы company не существует - возможно миграции не выполнены')
      }
      return
    }
    
    console.log('✅ Подключение успешно!')
    console.log('💡 Таблица company доступна')
    
  } catch (err) {
    console.error('❌ Ошибка подключения:', err.message)
  }
}

testConnection()