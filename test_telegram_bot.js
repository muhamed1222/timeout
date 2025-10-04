const fetch = require('node-fetch');

// Тестовые данные
const testUpdates = [
  {
    name: "Тест команды /start без инвайта",
    update: {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123456789, first_name: "Test", username: "testuser" },
        chat: { id: 123456789, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/start"
      }
    }
  },
  {
    name: "Тест команды /start с неверным инвайтом",
    update: {
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: 123456789, first_name: "Test", username: "testuser" },
        chat: { id: 123456789, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/start invalid_invite_code"
      }
    }
  },
  {
    name: "Тест команды /help",
    update: {
      update_id: 3,
      message: {
        message_id: 3,
        from: { id: 123456789, first_name: "Test", username: "testuser" },
        chat: { id: 123456789, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/help"
      }
    }
  },
  {
    name: "Тест команды /status",
    update: {
      update_id: 4,
      message: {
        message_id: 4,
        from: { id: 123456789, first_name: "Test", username: "testuser" },
        chat: { id: 123456789, type: "private" },
        date: Math.floor(Date.now() / 1000),
        text: "/status"
      }
    }
  },
  {
    name: "Тест callback кнопки start_shift",
    update: {
      update_id: 5,
      callback_query: {
        id: "test_callback_1",
        from: { id: 123456789, first_name: "Test", username: "testuser" },
        message: {
          message_id: 1,
          from: { id: 123456789, first_name: "Test", username: "testuser" },
          chat: { id: 123456789, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text: "Test message"
        },
        data: "start_shift"
      }
    }
  }
];

async function testWebhook(update, testName) {
  try {
    console.log(`\n🧪 Тестируем: ${testName}`);
    console.log(`📤 Отправляем update:`, JSON.stringify(update, null, 2));
    
    const response = await fetch('http://localhost:3001/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update)
    });
    
    const result = await response.text();
    console.log(`📥 Ответ сервера: ${response.status} - ${result}`);
    
    if (response.ok) {
      console.log('✅ Тест пройден');
    } else {
      console.log('❌ Тест не пройден');
    }
    
  } catch (error) {
    console.log(`❌ Ошибка теста: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Запуск тестов Telegram бота...\n');
  
  // Ждем, пока сервер запустится
  console.log('⏳ Ждем запуска сервера...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (const test of testUpdates) {
    await testWebhook(test.update, test.name);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между тестами
  }
  
  console.log('\n🏁 Тестирование завершено!');
}

runTests().catch(console.error);
