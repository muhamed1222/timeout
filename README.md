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
📖 **[Полное руководство по деплою](DEPLOYMENT.md)** - детальная инструкция с вариантами Vercel, Docker, VPS

⚡ **Или используйте кнопку "Deploy to Vercel" выше для быстрого старта**

## 🏗️ Архитектура

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js (модульная архитектура)
- **База данных**: PostgreSQL + Drizzle ORM
- **Аутентификация**: Supabase Auth
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **Безопасность**: Rate Limiting, JWT validation, роль-базированный доступ
- **Производительность**: In-memory кэширование, оптимизация запросов
- **Деплой**: Vercel / Docker / VPS

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
│   │   ├── components/  # UI компоненты (shadcn/ui)
│   │   ├── pages/       # Страницы приложения
│   │   ├── hooks/       # React хуки
│   │   └── lib/         # Утилиты и конфигурация
├── server/          # Express.js Backend
│   ├── routes/      # Модульные роутеры
│   │   ├── auth.ts       # Аутентификация
│   │   ├── companies.ts  # Управление компаниями
│   │   ├── employees.ts  # Управление сотрудниками
│   │   ├── invites.ts    # Приглашения
│   │   ├── schedules.ts  # Шаблоны расписаний
│   │   └── rating.ts     # Рейтинг и нарушения
│   ├── middleware/  # Middleware (auth, rate limiting)
│   ├── services/    # Бизнес-логика
│   ├── lib/         # Утилиты (logger, cache, env)
│   └── telegram/    # Telegram интеграция
├── shared/          # Общие TypeScript типы
│   ├── schema.ts    # Drizzle schema
│   └── api-types.ts # API типы для фронтенда
├── migrations/      # SQL миграции
└── scripts/         # Утилитные скрипты
```

## 🎯 Основные функции

### ✅ Готово к использованию
- 🔐 **Аутентификация**: Суп��base Auth с регистрацией
- 👥 **Управление сотрудниками**: CRUD операции, роли
- ⏰ **Отслеживание смен**: Планирование, старт/стоп, мониторинг
- ☕ **Перерывы**: Управление и учет рабочего времени
- 📱 **Telegram интеграция**: WebApp, бот-команды, уведомления
- 🚨 **Система нарушений**: Автоматическое обнаружение и учет
- ⭐ **Рейтинг сотрудников**: Динамический расчет на основе нарушений
- 📊 **Ежедневные отчеты**: Автоматические сводки
- 💳 **Приглашения**: QR-коды и deep links для Telegram
- 🛡️ **Безопасность**: Rate limiting, JWT validation, RBAC
- ⚡ **Производительность**: Кэширование, оптимизация N+1 запросов
- 📈 **Дашборд**: Статистика и аналитика в реальном времени

### 🎨 Архитектурные улучшения
- 📦 **Модульная структура**: Разделение роутеров по доменам
- 📝 **Структурированное логирование**: Winston logger с контекстом
- ✅ **Валидация env**: Zod-based env validation при старте
- 🔄 **Типобезопасность**: Shared API types для фронтенда и бэкенда
- 🐳 **Docker support**: Multi-stage build для production
- 🚀 **CI/CD**: GitHub Actions workflows

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

### 📉 Рейтинг и нарушения

Эндпоинты для системы рейтинга сотрудников:

- Правила нарушений компании
  - GET `/api/companies/:companyId/violation-rules` — список правил компании
  - POST `/api/violation-rules` — создать правило (body: { company_id, code, name, penalty_percent, auto_detectable, is_active })
  - PUT `/api/violation-rules/:id` — обновить правило (partial body)
  - DELETE `/api/violation-rules/:id` — удалить правило
  - Валидация: `code` уникален в рамках компании; при дубликате — 409

- Нарушения
  - POST `/api/violations` — создать нарушение (body: { employee_id, company_id, rule_id, source: 'manual'|'auto', reason? })
  - Пересчет рейтинга за текущий месяц (побочный эффект) + авто-блокировка при rating ≤ 30%
  - Telegram-уведомления: о нарушении, критическом уровне, блокировке

- Рейтинги
  - GET `/api/companies/:companyId/ratings?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD` — рейтинги сотрудников компании за период
  - POST `/api/companies/:companyId/ratings/recalculate` — пересчитать рейтинги (текущий месяц) по компании
  - POST `/api/ratings/recalculate` — глобальный пересчет по всем компаниям (необязательные body: { periodStart, periodEnd })

## 📝 Лицензия

MIT License