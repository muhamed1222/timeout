# 🚀 Инструкция по деплою ShiftManager на Vercel

## Пошаговое руководство

### 1. 📋 Настройка Supabase (база данных + аутентификация)

Supabase предоставляет всё необходимое: PostgreSQL базу данных и систему аутентификации.

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)  
2. Создайте новый проект
3. Перейдите в Settings → Database → Connection string и скопируйте DATABASE_URL
4. Перейдите в Settings → API и скопируйте Project URL, anon key, service_role key
5. В Authentication → Settings включите Email authentication

### 2. 📊 Выполнение миграций базы данных

```sql
-- Выполните в Supabase SQL Editor или через psql:
-- Скопируйте содержимое файла migrations/0000_silly_iron_monger.sql
-- И выполните в вашей базе данных
```

### 3. 🚀 Деплой на Vercel

#### Способ 1: Через GitHub (рекомендуется)
1. Загрузите код в GitHub репозиторий
2. Зайдите на [vercel.com](https://vercel.com)
3. Нажмите "New Project" → Import Git Repository
4. Выберите ваш репозиторий

#### Способ 2: Через Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

### 4. ⚙️ Настройка переменных окружения в Vercel

В настройках проекта Vercel (Settings → Environment Variables) добавьте:

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

**Опционально (для Telegram бота):**
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIjKlMnOpQrStUvWxYz
TELEGRAM_BOT_USERNAME=your_bot_name
```

### 5. 🤖 Настройка Telegram бота (опционально)

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте WebApp в боте:
```
/newapp
/setmenubutton
```
4. Настройте webhook:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/telegram/webhook"}'
```

### 6. ✅ Проверка деплоя

1. Откройте ваше приложение: `https://your-app.vercel.app`
2. Попробуйте зарегистрироваться как администратор
3. Создайте тестового сотрудника
4. Проверьте API: `https://your-app.vercel.app/api/companies`

## 🔍 Возможные проблемы и решения

### ❌ База данных не подключается
- Проверьте CONNECTION_STRING в переменных окружения
- Убедитесь, что база данных доступна из интернета
- Проверьте правильность логина/пароля

### ❌ Ошибки сборки
```bash
# Локально протестируйте сборку:
npm run build
```

### ❌ API не работает
- Проверьте логи в Vercel Dashboard → Functions
- Убедитесь, что все переменные окружения настроены
- Проверьте, что миграции выполнены

### ❌ Telegram бот не отвечает
- Проверьте webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Убедитесь, что TELEGRAM_BOT_TOKEN правильный
- Проверьте логи функции `/api/telegram/webhook`

## 📱 Тестирование Telegram WebApp

1. Создайте сотрудника в админ-панели
2. Создайте invite-код
3. Получите QR-код или ссылку
4. Откройте через Telegram
5. Протестируйте начало/завершение смены

## 🎯 Готово!

Ваше приложение развернуто и готово к использованию:
- **Админ-панель**: `https://your-app.vercel.app`
- **API**: `https://your-app.vercel.app/api/*`
- **Telegram WebApp**: Через вашего бота

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в Vercel Dashboard
2. Убедитесь в правильности всех переменных окружения
3. Проверьте, что база данных доступна и миграции выполнены