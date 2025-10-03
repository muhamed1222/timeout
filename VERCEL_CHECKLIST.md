# ✅ ЧЕКРЛИСТ ДЛЯ ДЕПЛОЯ НА VERCEL

## 🚀 Быстрый старт (5 минут)

### 1. Подготовка базы данных
- [ ] Создайте аккаунт на [neon.tech](https://neon.tech) 
- [ ] Создайте новую PostgreSQL базу
- [ ] Скопируйте Connection String

### 2. Настройка Supabase
- [ ] Создайте проект на [supabase.com](https://supabase.com)
- [ ] Включите Email Authentication
- [ ] Скопируйте URL, anon key, service_role key

### 3. Выполнение миграций
- [ ] Откройте Supabase SQL Editor
- [ ] Скопируйте и выполните содержимое `migrations/0000_silly_iron_monger.sql`

### 4. Деплой на Vercel
- [ ] Загрузите код на GitHub
- [ ] Подключите репозиторий в [vercel.com](https://vercel.com)
- [ ] Добавьте переменные окружения (см. ниже)

### 5. Переменные окружения в Vercel

**Обязательные:**
```
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

**Опциональные (для Telegram):**
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIjKlMnOpQrStUvWxYz
TELEGRAM_BOT_USERNAME=your_bot_name
```

## ✅ Проверка работы

После деплоя проверьте:
- [ ] Главная страница загружается: `https://your-app.vercel.app`
- [ ] API отвечает: `https://your-app.vercel.app/api/companies`
- [ ] Регистрация администратора работает
- [ ] Можно создать компанию и сотрудника

## 🎯 Готово!

Ваше приложение ShiftManager развернуто и готово к использованию!

**Полезные ссылки:**
- 📖 [Полная инструкция](DEPLOY.md)
- 🔍 [Аудит проекта](AUDIT.md)
- 📋 [Техническая документация](README.md)