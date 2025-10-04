# ✅ ЧЕКРЛИСТ ДЛЯ ДЕПЛОЯ НА VERCEL

## 🚀 Быстрый старт (5 минут)

### 1. Настройка Supabase (база данных + аутентификация)
- [ ] Создайте проект на [supabase.com](https://supabase.com)
- [ ] Включите Email Authentication в настройках
- [ ] Скопируйте Database URL из Settings → Database → Connection string
- [ ] Скопируйте Project URL, anon key, service_role key из Settings → API

### 2. Выполнение миграций базы данных
- [ ] Откройте Supabase SQL Editor
- [ ] Скопируйте и выполните содержимое `migrations/0000_silly_iron_monger.sql`

### 3. Деплой на Vercel
- [ ] Загрузите код на GitHub
- [ ] Подключите репозиторий в [vercel.com](https://vercel.com)
- [ ] Добавьте переменные окружения (см. ниже)

### 4. Переменные окружения в Vercel

**Обязательные:**
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

**🔍 Где найти эти значения в Supabase:**

1. **DATABASE_URL** 
   - Перейдите: Settings → Database → Connection string → URI
   - Выберите режим "Session pooler" для продакшена

2. **SUPABASE_URL** 
   - Перейдите: Settings → API → Project URL
   - Начинается с `https://` и заканчивается `.supabase.co`

3. **SUPABASE_ANON_KEY** 
   - Перейдите: Settings → API → Project API keys 
   - Найдите ключ с пометкой `anon` `public`
   - Это публичный ключ для frontend

4. **SUPABASE_SERVICE_ROLE_KEY** ⚠️
   - Перейдите: Settings → API → Project API keys
   - Найдите ключ с пометкой `service_role` `secret`
   - ⚠️ **ВАЖНО**: Это секретный ключ с полным доступом к БД!

**Опциональные (для Telegram):****
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIjKlMnOpQrStUvWxYz
TELEGRAM_BOT_USERNAME=your_bot_name
```

## 🔍 Возможные проблемы и решения

### ❌ "Function Runtimes must have a valid version"
**Решение:**
```bash
# 1. Убедитесь что vercel.json НЕ содержит секцию "functions"
# 2. Используйте только "rewrites" для маршрутизации
# 3. Перезапустите деплой после обновления vercel.json
```

### ❌ База данных не подключается
- Проверьте DATABASE_URL в переменных окружения
- Убедитесь, что база данных доступна из интернета
- Проверьте правильность логина/пароля

### ❌ API не работает
- Проверьте логи в Vercel Dashboard → Functions
- Убедитесь, что все переменные окружения настроены
- Проверьте, что миграции выполнены

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