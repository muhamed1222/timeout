# 🚀 Инструкция по деплою RecipeRoulette на Vercel

## ✅ Статус проверки

Все системы готовы к деплою:
- ✅ База данных Supabase подключена
- ✅ Схема базы данных синхронизирована  
- ✅ Проект успешно собирается
- ✅ Telegram бот активен (@outworkru_bot)
- ✅ Переменные окружения настроены

## 🚀 Пошаговый деплой

### 1. Подготовка к деплою

```bash
# Убедитесь, что вы в корневой папке проекта
cd /Users/outcasts/Downloads/RecipeRoulette

# Проверьте, что все зависимости установлены
npm install

# Проверьте сборку
npm run build
```

### 2. Деплой через Vercel CLI

```bash
# Установите Vercel CLI (если не установлен)
npm i -g vercel

# Войдите в аккаунт Vercel
vercel login

# Деплой проекта
vercel

# Следуйте инструкциям:
# - Set up and deploy? Y
# - Which scope? [ваш аккаунт]
# - Link to existing project? N
# - Project name: recipe-roulette (или любое другое имя)
# - Directory: ./
```

### 3. Настройка переменных окружения в Vercel

После деплоя добавьте переменные окружения в Vercel Dashboard:

1. Откройте проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в Settings → Environment Variables
3. Добавьте следующие переменные:

```bash
# Обязательные переменные
DATABASE_URL=postgresql://postgres.chkziqbxvdzwhlucfrza:S2ljE6NzGIAJAjtn@aws-1-eu-west-2.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://chkziqbxvdzwhlucfrza.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQxMDU0NywiZXhwIjoyMDc0OTg2NTQ3fQ.wKTHzQiAa4kjNhtFmTR9lYy2LdFki-CoJQKJjmOw8E8
NODE_ENV=production

# Переменные для фронтенда
VITE_SUPABASE_URL=https://chkziqbxvdzwhlucfrza.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=8472138192:AAGMrm0l1HrZIzZJYHQP46RK_SrHmauHZ3M
TELEGRAM_BOT_USERNAME=@outworkru_bot
```

### 4. Настройка Telegram Webhook

После деплоя настройте webhook для Telegram бота:

```bash
# Замените YOUR_DOMAIN на ваш домен Vercel
curl -X POST "https://api.telegram.org/bot8472138192:AAGMrm0l1HrZIzZJYHQP46RK_SrHmauHZ3M/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_DOMAIN.vercel.app/api/telegram/webhook"}'
```

### 5. Проверка деплоя

1. **Откройте приложение**: `https://YOUR_DOMAIN.vercel.app`
2. **Проверьте API**: `https://YOUR_DOMAIN.vercel.app/api/companies`
3. **Проверьте регистрацию**: Попробуйте зарегистрироваться как администратор
4. **Проверьте Telegram бота**: Отправьте `/start` боту @outworkru_bot

## 🔧 Возможные проблемы и решения

### ❌ Ошибка сборки
```bash
# Проверьте локально
npm run build

# Если есть ошибки TypeScript
npm run check
```

### ❌ База данных не подключается
- Проверьте DATABASE_URL в переменных окружения
- Убедитесь, что база данных Supabase активна
- Проверьте логи в Vercel Dashboard → Functions

### ❌ Telegram бот не отвечает
```bash
# Проверьте webhook
curl "https://api.telegram.org/bot8472138192:AAGMrm0l1HrZIzZJYHQP46RK_SrHmauHZ3M/getWebhookInfo"

# Если нужно удалить webhook
curl -X POST "https://api.telegram.org/bot8472138192:AAGMrm0l1HrZIzZJYHQP46RK_SrHmauHZ3M/deleteWebhook"
```

### ❌ Supabase аутентификация не работает
- Проверьте SUPABASE_URL и SUPABASE_ANON_KEY
- Убедитесь, что в Supabase включена Email аутентификация
- Проверьте настройки CORS в Supabase

## 📱 Тестирование функций

### 1. Регистрация администратора
1. Откройте приложение
2. Перейдите на `/register`
3. Заполните форму регистрации
4. Проверьте создание компании в базе данных

### 2. Создание сотрудника
1. Войдите как администратор
2. Перейдите на дашборд
3. Нажмите "Добавить сотрудника"
4. Создайте invite-код
5. Получите QR-код для приглашения

### 3. Telegram WebApp
1. Отправьте invite-код боту @outworkru_bot
2. Нажмите "Начать" в боте
3. Протестируйте начало/завершение смены
4. Проверьте WebApp по ссылке из бота

## 🎯 Готово!

После выполнения всех шагов у вас будет:
- ✅ Работающее веб-приложение на Vercel
- ✅ API с 43+ endpoints
- ✅ Telegram бот для сотрудников
- ✅ WebApp для управления сменами
- ✅ Система приглашений с QR-кодами
- ✅ Мониторинг и аудит

**Ваше приложение готово к использованию!** 🎉
