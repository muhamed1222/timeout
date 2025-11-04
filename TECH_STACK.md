# 🛠️ Технологический стек проекта ShiftManager

**Дата создания:** Январь 2025  
**Версия проекта:** 1.0.0  
**Статус:** Production Ready ✅

> **📌 Важно:** Этот документ определяет все технологии, используемые в проекте. При разработке используйте ТОЛЬКО эти технологии и не добавляйте новые без обоснования.

---

## 📋 Содержание

1. [Языки программирования](#языки-программирования)
2. [Frontend технологии](#frontend-технологии)
3. [Backend технологии](#backend-технологии)
4. [База данных](#база-данных)
5. [Аутентификация и безопасность](#аутентификация-и-безопасность)
6. [UI/UX библиотеки](#uiux-библиотеки)
7. [Интеграции](#интеграции)
8. [Инструменты разработки](#инструменты-разработки)
9. [Тестирование](#тестирование)
10. [DevOps и деплой](#devops-и-деплой)
11. [Мониторинг и логирование](#мониторинг-и-логирование)
12. [Специфичные инструменты](#специфичные-инструменты)

---

## 🔤 Языки программирования

### Основные
- **TypeScript** `5.6.3` ⭐
  - Строгая типизация (strict mode)
  - ES Modules (type: "module")
  - Path aliases: `@/*`, `@shared/*`

### Конфигурационные файлы
- **JSON** - package.json, tsconfig.json, vercel.json
- **YAML** - docker-compose.yml, openapi.yaml
- **JavaScript** (только для конфигов) - eslint.config.js, vite.config.ts, concurrent-dev.cjs

---

## 🎨 Frontend технологии

### Основной фреймворк
- **React** `18.3.1` ⭐
  - Функциональные компоненты
  - React Hooks
  - React DOM `18.3.1`

### Роутинг
- **wouter** `3.3.5` ⭐
  - Легковесный роутер для React
  - Hooks-based API

### State Management
- **@tanstack/react-query** `5.60.5` ⭐
  - Управление server state
  - Кэширование API запросов
  - Инвалидация кэша

### Сборка и разработка
- **Vite** `5.4.20` ⭐
  - Build tool
  - HMR (Hot Module Replacement)
  - Fast refresh
- **@vitejs/plugin-react** `4.7.0`
  - Плагин React для Vite
- **esbuild** `0.25.11`
  - Bundler (используется Vite)

### Формы
- **react-hook-form** `7.55.0` ⭐
  - Управление формами
- **@hookform/resolvers** `3.10.0`
  - Интеграция с Zod валидацией

### Валидация (Frontend + Backend)
- **zod** `3.24.2` ⭐
  - Runtime валидация
  - TypeScript inference
- **zod-validation-error** `3.4.0`
  - Улучшенные сообщения об ошибках

### Анимации
- **framer-motion** `11.13.1` ⭐
  - Анимации компонентов
  - Transitions

### Иконки
- **lucide-react** `0.453.0` ⭐
  - Основная библиотека иконок
- **react-icons** `5.4.0`
  - Дополнительные иконки (если нужны)

### Графики и визуализация
- **recharts** `2.15.2` ⭐
  - Библиотека графиков
- **react-resizable-panels** `2.1.7`
  - Resizable панели

### Работа с датами
- **date-fns** `3.6.0` ⭐
  - Форматирование дат
  - Манипуляции с датами
- **react-day-picker** `8.10.1`
  - Компонент выбора даты

### Утилиты
- **clsx** `2.1.1` ⭐
  - Условные классы CSS
- **tailwind-merge** `2.6.0` ⭐
  - Слияние Tailwind классов
- **class-variance-authority** `0.7.1`
  - Управление вариантами компонентов

### Дополнительные компоненты
- **cmdk** `1.1.1`
  - Command menu компонент
- **vaul** `1.1.2`
  - Drawer компонент
- **embla-carousel-react** `8.6.0`
  - Карусель компонент
- **input-otp** `1.4.2`
  - OTP input компонент

### Темизация
- **next-themes** `0.4.6` ⭐
  - Управление темой (dark/light mode)

---

## ⚙️ Backend технологии

### Фреймворк
- **Express.js** `4.21.2` ⭐
  - Web framework для Node.js
  - Middleware support

### Runtime
- **Node.js** `20+` ⭐
  - JavaScript runtime
  - ES Modules support

### Валидация (Backend)
- **zod** `3.24.2` ⭐ (общий с Frontend)
  - Валидация запросов
  - Middleware валидация

### Парсинг данных
- **cookie-parser** `1.4.7` ⭐
  - Парсинг cookies
- **@types/cookie-parser** `1.4.10`

### CORS
- **cors** `2.8.5` ⭐
  - Cross-Origin Resource Sharing

### Безопасность
- **helmet** `8.1.0` ⭐
  - Security headers
- **express-rate-limit** `8.1.0` ⭐
  - Rate limiting middleware

### Сессии
- **express-session** `1.18.1` ⭐
  - Управление сессиями
- **connect-pg-simple** `10.0.0`
  - PostgreSQL session store
- **memorystore** `1.6.7`
  - In-memory session store (dev)
- **@types/connect-pg-simple** `7.0.3`
- **@types/express-session** `1.18.0`

### Аутентификация
- **passport** `0.7.0`
  - Authentication middleware
- **passport-local** `1.0.0`
  - Local strategy
- **@types/passport** `1.0.16`
- **@types/passport-local** `1.0.38`

### WebSocket
- **ws** `8.18.0` ⭐
  - WebSocket support
- **@types/ws** `8.5.13`

### API документация
- **swagger-jsdoc** `6.2.8` ⭐
  - Генерация Swagger из JSDoc
- **swagger-ui-express** `5.0.1` ⭐
  - Swagger UI
- **@types/swagger-jsdoc** `6.0.4`
- **@types/swagger-ui-express** `4.1.8`

### Мониторинг метрик
- **prom-client** `15.1.3` ⭐
  - Prometheus метрики

---

## 🗄️ База данных

### ORM
- **drizzle-orm** `0.39.1` ⭐
  - TypeScript ORM
  - Type-safe queries
- **drizzle-zod** `0.7.0`
  - Интеграция с Zod
- **drizzle-kit** `0.31.4` (dev)
  - CLI для миграций

### База данных
- **PostgreSQL** ⭐
  - Основная БД
  - Провайдеры: Supabase / Neon
- **postgres** `3.4.7`
  - PostgreSQL клиент для Node.js
- **@neondatabase/serverless** `0.10.4`
  - Neon serverless driver
- **@types/pg** `8.15.5`

### Кэширование
- **redis** `5.9.0` ⭐
  - In-memory кэш
  - Session store
- **@types/redis** `4.0.10`

---

## 🔐 Аутентификация и безопасность

### Аутентификация
- **@supabase/supabase-js** `2.58.0` ⭐
  - Supabase Auth
  - JWT validation
  - User management

### Управление секретами
- **@aws-sdk/client-secrets-manager** `3.922.0` ⭐
  - AWS Secrets Manager
  - Production secrets

---

## 🎨 UI/UX библиотеки

### CSS Framework
- **Tailwind CSS** `3.4.17` ⭐
  - Utility-first CSS
  - Custom theme
- **tailwindcss-animate** `1.0.7` ⭐
  - Анимации для Tailwind
- **@tailwindcss/typography** `0.5.15`
  - Typography plugin
- **@tailwindcss/vite** `4.1.3`
  - Vite plugin для Tailwind
- **tw-animate-css** `1.2.5`
  - Дополнительные анимации

### UI Components (Radix UI)
Все компоненты на базе **Radix UI** (headless UI library) ⭐

- **@radix-ui/react-accordion** `1.2.4`
- **@radix-ui/react-alert-dialog** `1.1.7`
- **@radix-ui/react-aspect-ratio** `1.1.3`
- **@radix-ui/react-avatar** `1.1.4`
- **@radix-ui/react-checkbox** `1.1.5`
- **@radix-ui/react-collapsible** `1.1.4`
- **@radix-ui/react-context-menu** `2.2.7`
- **@radix-ui/react-dialog** `1.1.7`
- **@radix-ui/react-dropdown-menu** `2.1.7`
- **@radix-ui/react-hover-card** `1.1.7`
- **@radix-ui/react-label** `2.1.3`
- **@radix-ui/react-menubar** `1.1.7`
- **@radix-ui/react-navigation-menu** `1.2.6`
- **@radix-ui/react-popover** `1.1.7`
- **@radix-ui/react-progress** `1.1.3`
- **@radix-ui/react-radio-group** `1.2.4`
- **@radix-ui/react-scroll-area** `1.2.4`
- **@radix-ui/react-select** `2.1.7`
- **@radix-ui/react-separator** `1.1.3`
- **@radix-ui/react-slider** `1.2.4`
- **@radix-ui/react-slot** `1.2.0`
- **@radix-ui/react-switch** `1.1.4`
- **@radix-ui/react-tabs** `1.1.4`
- **@radix-ui/react-toast** `1.2.7`
- **@radix-ui/react-toggle** `1.1.3`
- **@radix-ui/react-toggle-group** `1.1.3`
- **@radix-ui/react-tooltip** `1.2.0`

> **Примечание:** Используется подход **shadcn/ui** - копирование компонентов в проект, а не установка как пакет.

### PostCSS
- **postcss** `8.4.47` (dev)
- **autoprefixer** `10.4.20` (dev)

---

## 🔗 Интеграции

### Telegram
- **telegraf** `4.16.3` ⭐
  - Telegram Bot API
  - Webhook support
  - Command handlers

---

## 🧪 Тестирование

### Unit и Integration тесты
- **vitest** `4.0.3` ⭐
  - Test runner
  - Jest-compatible API
- **@vitest/coverage-v8** `4.0.6`
  - Coverage отчеты
- **@vitest/ui** `4.0.3`
  - UI для тестов

### E2E тесты
- **@playwright/test** `1.47.2` ⭐
  - End-to-end тестирование
  - Browser automation

### Testing Library
- **@testing-library/react** `16.3.0` ⭐
  - React компоненты
- **@testing-library/dom** `10.4.1`
  - DOM утилиты
- **@testing-library/jest-dom** `6.9.1`
  - Jest DOM matchers
- **@testing-library/user-event** `14.6.1`
  - User interactions

### Тестовое окружение
- **jsdom** `27.1.0` (dev)
  - DOM environment для тестов
- **supertest** `7.1.4` (dev)
  - HTTP assertions
- **@types/supertest** `6.0.3`

---

## 🛠️ Инструменты разработки

### Линтинг
- **eslint** `9.38.0` ⭐
  - Code linting
- **@eslint/js** `9.39.0`
  - ESLint flat config
- **@typescript-eslint/eslint-plugin** `8.46.2` ⭐
  - TypeScript правила
- **@typescript-eslint/parser** `8.46.2` ⭐
  - TypeScript parser
- **eslint-plugin-react** `7.37.5` ⭐
  - React правила
- **eslint-plugin-react-hooks** `7.0.1` ⭐
  - React Hooks правила

### Форматирование
- **prettier** `3.6.2` ⭐
  - Code formatting

### Git hooks
- **husky** `9.1.7` ⭐
  - Git hooks
- **lint-staged** `16.2.6` ⭐
  - Lint только staged files

### TypeScript
- **typescript** `5.6.3` ⭐
  - TypeScript compiler
- **tsx** `4.20.5` (dev)
  - TypeScript execution
  - Используется для скриптов

### Переменные окружения
- **dotenv** `17.2.3` (dev)
  - .env файлы

### Утилиты
- **@jridgewell/trace-mapping** `0.3.25`
  - Source maps

### Replit специфичные (опционально)
- **@replit/vite-plugin-cartographer** `0.3.1` (dev)
- **@replit/vite-plugin-dev-banner** `0.1.1` (dev)
- **@replit/vite-plugin-runtime-error-modal** `0.0.3` (dev)

---

## 🚀 DevOps и деплой

### Деплой
- **Vercel** ⭐
  - Serverless Functions
  - Edge Functions
- **@vercel/node** `3.0.0` (dev)
  - Vercel runtime

### Контейнеризация
- **Docker** ⭐
  - Containerization
- **docker-compose** ⭐
  - Multi-container apps

### CI/CD
- **GitHub Actions** ⭐
  - CI/CD workflows

---

## 📊 Мониторинг и логирование

### Error Tracking
- **@sentry/node** `10.22.0` ⭐
  - Backend error tracking
- **@sentry/react** `10.22.0` ⭐
  - Frontend error tracking
- **@sentry/profiling-node** `10.22.0`
  - Performance profiling

### Метрики
- **prom-client** `15.1.3` ⭐ (уже в Backend)
  - Prometheus метрики

---

## 📦 Специфичные инструменты

### Type definitions
- **@types/node** `20.16.11` ⭐
- **@types/react** `18.3.11` ⭐
- **@types/react-dom** `18.3.1` ⭐
- **@types/cors** `2.8.19`
- **@types/express** `4.17.21` ⭐

### Опциональные зависимости
- **bufferutil** `4.0.8` (optional)
  - WebSocket оптимизация

---

## ⭐ Ключевые технологии (Обязательные)

### Frontend Core
1. **React 18.3.1** - UI framework
2. **TypeScript 5.6.3** - Типизация
3. **Vite 5.4.20** - Build tool
4. **wouter 3.3.5** - Routing
5. **@tanstack/react-query 5.60.5** - State management
6. **Tailwind CSS 3.4.17** - Styling
7. **Radix UI** - UI компоненты (через shadcn/ui)
8. **zod 3.24.2** - Валидация
9. **react-hook-form 7.55.0** - Формы

### Backend Core
1. **Express.js 4.21.2** - Web framework
2. **Node.js 20+** - Runtime
3. **TypeScript 5.6.3** - Типизация
4. **drizzle-orm 0.39.1** - ORM
5. **PostgreSQL** - База данных
6. **zod 3.24.2** - Валидация
7. **@supabase/supabase-js 2.58.0** - Auth

### Infrastructure
1. **Vercel** - Деплой
2. **Docker** - Контейнеризация
3. **GitHub Actions** - CI/CD
4. **Sentry** - Мониторинг
5. **Prometheus** - Метрики

---

## 🚫 Что НЕ используется

### Frontend
- ❌ Next.js (используется Vite + React)
- ❌ Redux / Zustand (используется React Query)
- ❌ React Router (используется wouter)
- ❌ Material-UI / Ant Design (используется Radix UI + shadcn/ui)
- ❌ CSS Modules / Styled Components (используется Tailwind CSS)
- ❌ Apollo Client (нет GraphQL)
- ❌ MobX

### Backend
- ❌ Nest.js (используется Express.js)
- ❌ Prisma (используется Drizzle ORM)
- ❌ TypeORM / Sequelize (используется Drizzle ORM)
- ❌ GraphQL (используется REST API)
- ❌ Socket.io (используется ws)
- ❌ JWT библиотеки (используется Supabase Auth)
- ❌ bcrypt (используется Supabase Auth)

### Database
- ❌ MongoDB (используется PostgreSQL)
- ❌ MySQL / MariaDB (используется PostgreSQL)
- ❌ Redis как основная БД (используется только для кэша)

### Testing
- ❌ Jest (используется Vitest)
- ❌ Cypress (используется Playwright)
- ❌ Mocha / Chai

---

## 📝 Правила добавления новых технологий

### ✅ Можно добавлять:
1. **Пакеты из экосистемы текущих технологий:**
   - Новые компоненты Radix UI
   - Дополнительные утилиты для Zod
   - Плагины для Vite
   - Middleware для Express

2. **Утилиты без альтернатив:**
   - Специфичные библиотеки для бизнес-логики
   - Уникальные инструменты

### ❌ НЕ добавлять:
1. **Альтернативы существующим технологиям:**
   - Новый UI framework
   - Альтернативный ORM
   - Другой build tool

2. **Без обоснования:**
   - Перед добавлением новой технологии нужно:
     - Обосновать необходимость
     - Проверить совместимость
     - Обновить этот документ

---

## 🔄 Обновление зависимостей

### Рекомендуется:
- Регулярно обновлять зависимости (раз в месяц)
- Проверять security advisories (`npm audit`)
- Обновлять мажорные версии осторожно

### Команды:
```bash
# Проверка устаревших пакетов
npm outdated

# Проверка безопасности
npm audit

# Обновление (осторожно!)
npm update

# Обновление конкретного пакета
npm install package@latest
```

---

## 📚 Полезные ссылки

### Документация
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Express.js](https://expressjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Zod](https://zod.dev/)
- [React Query](https://tanstack.com/query/latest)

### Best Practices
- [shadcn/ui](https://ui.shadcn.com/) - UI компоненты
- [Vercel Best Practices](https://vercel.com/docs)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Последнее обновление:** Январь 2025  
**Версия документа:** 1.0
