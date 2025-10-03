# 🚀 ShiftManager - Система управления рабочими сменами

> **🎉 Проект готов к деплою на Vercel!**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/shiftmanager)

Полнофункциональная система управления рабочими сменами сотрудников с интеграцией Telegram-бота.

## 🚀 Быстрый деплой (5 минут)

### 1. Клонируйте репозиторий
```bash
git clone <your-repo>
cd shiftmanager
```

### 2. Проверьте готовность
```bash
npm install
npm run check-deploy
```

### 3. Следуйте чекрлисту
📋 **[Чекрлист для деплоя](VERCEL_CHECKLIST.md)** - пошаговая инструкция на 5 минут

📖 **[Подробная инструкция](DEPLOY.md)** - полное руководство по настройке

## 🏗️ Архитектура

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js  
- **База данных**: PostgreSQL + Drizzle ORM
- **Аутентификация**: Supabase Auth
- **UI**: Tailwind CSS + Radix UI
- **Деплой**: Vercel

## 🚀 Деплой на Vercel

### 1. Подготовка базы данных

Создайте PostgreSQL базу данных. Рекомендуемые провайдеры:
- [Neon](https://neon.tech/) (бесплатно)
- [Supabase](https://supabase.com/) (бесплатно) 
- [Railway](https://railway.app/)

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Получите URL и ключи API из настроек проекта
3. В Supabase SQL Editor выполните миграции из папки `migrations/`

### 3. Деплой на Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/shiftmanager)

Или вручную:

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. Войдите в аккаунт Vercel
vercel login

# 3. Деплой проекта
vercel

# 4. Настройте переменные окружения
vercel env add
```

### 4. Переменные окружения в Vercel

В настройках проекта Vercel добавьте следующие переменные:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-bot-token (опционально)
TELEGRAM_BOT_USERNAME=your-bot-username (опционально)
NODE_ENV=production
```

### 5. Настройка Telegram бота (опционально)

```bash
# Создайте бота через @BotFather
# Получите токен и добавьте его в переменные окружения
# Настройте webhook:
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-vercel-app.vercel.app/api/telegram/webhook"}'
```

## 🛠️ Локальная разработка

```bash
# 1. Клонируйте репозиторий
git clone <your-repo>
cd shiftmanager

# 2. Установите зависимости
npm install

# 3. Скопируйте переменные окружения
cp .env.example .env.local

# 4. Запустите миграции базы данных
npm run db:push

# 5. Запустите проект
npm run dev
```

## 📁 Структура проекта

```
├── api/             # Vercel Serverless Functions
├── client/          # React Frontend
│   ├── src/
│   │   ├── components/  # UI компоненты
│   │   ├── pages/       # Страницы приложения
│   │   ├── hooks/       # React хуки
│   │   └── lib/         # Утилиты и конфигурация
├── server/          # Express.js Backend
│   ├── handlers/    # Telegram обработчики
│   ├── services/    # Бизнес-логика
│   └── lib/         # Утилиты сервера
├── shared/          # Общие TypeScript типы
└── migrations/      # SQL миграции
```

## 🎯 Основные функции

### ✅ Готово к использованию
- 🔐 Аутентификация и регистрация
- 👥 Управление сотрудниками
- ⏰ Отслеживание рабочих смен
- ☕ Управление перерывами
- 📱 Telegram WebApp интеграция
- 🚨 Автоматическое обнаружение нарушений
- 📊 Ежедневные отчеты
- 💳 Система приглашений с QR-кодами

### 🚧 В разработке
- 📈 Дашборд с аналитикой
- 🗓️ Управление графиками работы
- 📋 Генерация отчетов
- ⚙️ Настройки компании

## 🤖 Telegram интеграция

Система поддерживает полную интеграцию с Telegram:

- **Бот-команды**: Начало/завершение смены, перерывы
- **WebApp**: Удобный интерфейс внутри Telegram
- **Уведомления**: Автоматические напоминания
- **QR-коды**: Легкое подключение сотрудников

## 🔧 API Documentation

API предоставляет 43+ эндпоинта для:
- Управления компаниями и сотрудниками
- Работы со сменами и интервалами
- Мониторинга и отчетности
- Интеграции с Telegram

Полная документация API доступна в файле `AUDIT.md`.

## 📝 Лицензия

MIT License