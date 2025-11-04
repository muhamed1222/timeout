# Outcasts Project — Technical Instructions

Полное руководство по настройке, развертыванию и работе с проектом.

**Обновлено:** 29 января 2025  
**Статус:** Production Ready

---

## Содержание

1. [Окружение и конфигурации](#1-окружение-и-конфигурации)
2. [Supabase и базы данных](#2-supabase-и-базы-данных)
3. [Yandex OAuth](#3-yandex-oauth)
4. [Vercel и деплой фронтенда](#4-vercel-и-деплой-фронтенда)
5. [Telegram Bot](#5-telegram-bot)
6. [Docker и локальная разработка](#6-docker-и-локальная-разработка)
7. [CI/CD](#7-cicd)
8. [База данных и миграции](#8-база-данных-и-миграции)
9. [Мониторинг и логирование](#9-мониторинг-и-логирование)
10. [Примечания и советы](#10-примечания-и-советы)

---

## 1. Окружение и конфигурации

### Переменные окружения

Создайте файл `.env.local` в корне проекта на основе `.env.example`:

\`\`\`env
# База данных (обязательно)
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase настройки (обязательно)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Переменные для фронтенда (обязательно)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Yandex OAuth
YANDEX_CLIENT_ID=your-client-id
YANDEX_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://localhost:5173

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_BOT_USERNAME=@your_bot_username
BOT_API_SECRET=your-32-char-secret-here

# Настройки сервера
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-session-secret-here

# Redis (опционально, для кэширования)
REDIS_URL=redis://host:6379

# Sentry (опционально, для мониторинга ошибок)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Vercel Cron (для продакшена)
CRON_SECRET=your-cron-secret-here
\`\`\`

### Запуск локальной разработки

\`\`\`bash
# Установка зависимостей
npm install

# Запуск фронтенда (порт 5173) и бэкенда (порт 3001) одновременно
npm run dev
\`\`\`

**Примечание:** `npm run dev` использует `concurrent-dev.cjs` для запуска обоих серверов:
- **Frontend**: Vite dev server на порту **5173**
- **Backend**: Express.js API на порту **3001**
- Vite проксирует запросы `/api` с порта 5173 на порт 3001

---

## 2. Supabase и базы данных

### Создание проекта в Supabase

1. Перейдите на [https://supabase.com](https://supabase.com)
2. Зарегистрируйтесь или войдите
3. Нажмите "New Project"
4. Заполните:
   - **Name**: timeout (или любое имя)
   - **Database Password**: придумайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион
5. Нажмите "Create new project"
6. Дождитесь создания (1-2 минуты)

### Получение ключей Supabase

1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### Настройка Auth в Supabase

1. Перейдите в **Authentication** → **Providers**
2. Включите **Email** (если не включен)
3. Настройте **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: добавьте:
     - `http://localhost:5173/**`
     - `http://localhost:3001/**`

### Основные команды Supabase CLI

\`\`\`bash
# Проверка подключения к базе данных
npm run db:health

# Применение миграций (push схемы в БД)
npm run db:push

# Анализ индексов
npm run db:analyze-indexes

# Анализ медленных запросов
npm run db:analyze-queries
\`\`\`

### Подключение к базе данных

**Варианты подключения:**

1. **Прямое подключение** (рекомендуется для разработки):
   \`\`\`
   postgresql://postgres.PROJECT_ID:PASSWORD@aws-REGION.supabase.co:5432/postgres
   \`\`\`

2. **Транзакционный pooler** (рекомендуется для продакшена):
   \`\`\`
   postgresql://postgres.PROJECT_ID:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
   \`\`\`

**Важно:** Используйте pooler для продакшена, чтобы избежать превышения лимита соединений.

---

## 3. Yandex OAuth

### Создание приложения в Yandex OAuth

1. Перейдите на [https://oauth.yandex.ru/](https://oauth.yandex.ru/)
2. Нажмите **"Зарегистрировать новое приложение"**
3. Заполните форму:
   - **Название приложения**: OutTime
   - **Платформы**: Web-сервисы
   - **Redirect URI**: 
     - Для разработки: `http://localhost:3001/api/auth/yandex/callback`
     - Для продакшена: `https://yourdomain.com/api/auth/yandex/callback`
4. Выберите права доступа:
   - ✅ Доступ к адресу электронной почты
   - ✅ Доступ к логину, имени и фамилии, полу
5. Получите:
   - **ID приложения** (Client ID)
   - **Пароль приложения** (Client Secret)

### Настройка переменных окружения

\`\`\`env
YANDEX_CLIENT_ID=your-client-id
YANDEX_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://localhost:5173
\`\`\`

**Важно:** 
- Callback должен идти **напрямую на backend** (порт 3001), а не через frontend (порт 5173)
- После изменения Redirect URI в Yandex подождите 1-2 минуты

### Решение проблем

**Ошибка "token_exchange_failed":**
- Проверьте, что Redirect URI в Yandex точно совпадает с URL в коде
- Убедитесь, что Client ID и Client Secret правильные
- Проверьте переменные окружения в `.env.local`

**Ошибка "invalid_state":**
- Разрешите cookies для `localhost:5173` и `localhost:3001`
- Попробуйте в режиме инкогнито
- Не очищайте cookies между запросами

---

## 4. Vercel и деплой фронтенда

### Быстрый деплой

1. **Установите Vercel CLI:**
   \`\`\`bash
   npm i -g vercel
   vercel login
   \`\`\`

2. **Деплой проекта:**
   \`\`\`bash
   vercel
   \`\`\`

3. **Настройте переменные окружения:**
   \`\`\`bash
   vercel env add NODE_ENV production
   vercel env add DATABASE_URL <your-supabase-url>
   vercel env add SUPABASE_URL <url>
   vercel env add SUPABASE_ANON_KEY <key>
   vercel env add SUPABASE_SERVICE_ROLE_KEY <key>
   vercel env add YANDEX_CLIENT_ID <id>
   vercel env add YANDEX_CLIENT_SECRET <secret>
   vercel env add TELEGRAM_BOT_TOKEN <token>
   vercel env add TELEGRAM_BOT_USERNAME <username>
   vercel env add BOT_API_SECRET <generate-with: openssl rand -hex 32>
   vercel env add SESSION_SECRET <generate-with: openssl rand -hex 32>
   vercel env add CRON_SECRET <generate-with: openssl rand -hex 32>
   \`\`\`

4. **Деплой в продакшен:**
   \`\`\`bash
   vercel --prod
   \`\`\`

### Конфигурация Vercel

**Важно:** 
- Scheduler отключен на Vercel (используются Vercel Cron Jobs)
- AWS Secrets Manager не используется на Vercel (только переменные окружения)
- Cron endpoints защищены через `CRON_SECRET`

---

## 5. Telegram Bot

### Создание бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните токен бота

### Настройка переменных окружения

\`\`\`env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=@your_bot_username
BOT_API_SECRET=your-32-char-secret-here
\`\`\`

### Настройка Webhook

**Для локальной разработки (polling):**
- Бот автоматически использует polling режим
- Webhook не требуется

**Для продакшена (webhook):**

\`\`\`bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.vercel.app/api/telegram/webhook"}'
\`\`\`

Или через API проекта:

\`\`\`bash
curl -X POST https://your-domain.vercel.app/api/telegram/webhook/setup \
  -H "X-Bot-Secret: YOUR_BOT_API_SECRET"
\`\`\`

### Основные команды бота

- `/start [invite_code]` - Авторизация и подключение к системе
- Главное меню - Управление сменами, просмотр расписания

---

## 6. Docker и локальная разработка

### Запуск через Docker Compose

\`\`\`bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
\`\`\`

**Примечание:** Для локальной разработки рекомендуется использовать `npm run dev` вместо Docker.

---

## 7. CI/CD

### GitHub Actions Workflows

Проект использует несколько workflow файлов:

- **`ci-comprehensive.yml`** - Основной CI pipeline
- **`test.yml`** - Отдельный workflow для тестов
- **`deploy.yml`** - Production deployment
- **`pr-checks.yml`** - Быстрые проверки для PR

### Основные этапы CI/CD

1. **Lint & Format Check** - ESLint и Prettier
2. **TypeScript Type Check** - Проверка типов
3. **Unit Tests** - Запуск unit тестов с покрытием 80%+
4. **Integration Tests** - Тесты API endpoints с PostgreSQL
5. **E2E Tests** - Playwright browser tests
6. **Build Application** - Проверка сборки Vercel
7. **Security Audit** - npm audit

### Локальный запуск тестов

\`\`\`bash
# Unit тесты
npm run test:unit

# Integration тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# Все тесты
npm run test:all

# Покрытие кода
npm run test:coverage
\`\`\`

---

## 8. База данных и миграции

### Применение миграций

\`\`\`bash
# Push схемы в базу данных
npm run db:push

# Откат миграций
npm run db:rollback 1  # откатить последнюю миграцию
npm run db:rollback 3  # откатить последние 3 миграции
\`\`\`

### Резервное копирование

\`\`\`bash
# Создание бэкапа
npm run db:backup
# или
./scripts/backup-database.sh production

# Восстановление из бэкапа
npm run db:restore <backup_file> <environment>
# или
./scripts/restore-database.sh backups/production/backup.sql.gz production

# Проверка целостности бэкапа
npm run db:verify <backup_file> <environment>
\`\`\`

### Оптимизация базы данных

\`\`\`bash
# Проверка здоровья БД
npm run db:health

# Анализ индексов
npm run db:analyze-indexes

# Анализ медленных запросов
npm run db:analyze-queries
\`\`\`

**Примечание:** Проект уже включает оптимизации:
- 30+ индексов на основных таблицах
- Batch обработка для устранения N+1 проблем
- Кэширование статистики (TTL 2 минуты)
- Логирование медленных запросов (>1 секунды)

---

## 9. Мониторинг и логирование

### Health Check Endpoints

- **Общий health check:** `GET /api/health`
- **Readiness probe:** `GET /api/health/ready`
- **Liveness probe:** `GET /api/health/live`

### Prometheus Metrics

- **Endpoint:** `GET /api/metrics`
- **Метрики:**
  - HTTP requests duration и count
  - Active shifts, employees, violations
  - Database query duration
  - Cache hit/miss rates

### Sentry (опционально)

Для мониторинга ошибок:

1. Создайте проект в [Sentry](https://sentry.io)
2. Добавьте `SENTRY_DSN` в переменные окружения
3. Ошибки будут автоматически отправляться в Sentry

### Логирование

- Все запросы логируются с полным контекстом (userId, companyId, IP, userAgent)
- Медленные запросы (>1 секунды) логируются автоматически
- Критические ошибки отправляются в Sentry (если настроено)

---

## 10. Примечания и советы

### Порты проекта

- **Frontend (Vite)**: порт **5173**
- **Backend API**: порт **3001**
- **Docker**: порт **5000**

**Важно:** Callback для OAuth должен идти напрямую на backend (3001), не через frontend proxy.

### Структура проекта

\`\`\`
├── api/                    # Vercel Serverless Functions
├── client/                 # React Frontend
├── server/                 # Express.js Backend
├── shared/                 # Shared types and schemas
├── migrations/             # Database migrations
└── scripts/                # Utility scripts
\`\`\`

### Известные проблемы и решения

**Проблема:** База данных Supabase недоступна (таймауты)
- **Решение:** Используйте транзакционный pooler вместо прямого подключения

**Проблема:** OAuth callback не работает
- **Решение:** Убедитесь, что Redirect URI в Yandex точно совпадает с URL в коде (порт 3001)

**Проблема:** Scheduler не работает на Vercel
- **Решение:** Используйте Vercel Cron Jobs (настроены в `vercel.json`)

### Полезные команды

\`\`\`bash
# Проверка готовности к деплою
npm run check-deploy

# Линтинг и форматирование
npm run lint
npm run lint:fix
npm run format

# Проверка типов
npm run type-check

# Проверка сборки
npm run build
\`\`\`

### Переменные окружения для Vercel

**Обязательные:**
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`
- `CRON_SECRET` (для защиты cron endpoints)

**Опциональные:**
- `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` (если используете Yandex OAuth)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` (если используете Telegram bot)
- `REDIS_URL` (для кэширования)
- `SENTRY_DSN` (для мониторинга ошибок)

---

**Обновлено:** 29 января 2025  
**Версия:** 1.0.0
