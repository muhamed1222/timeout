# 🔧 НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

Ваш деплой работает! Но нужно настроить переменные окружения для полноценной работы.

## 📋 ЧТО НУЖНО СДЕЛАТЬ:

### 1. 🗄️ Создать Supabase проект

1. Зайдите на [supabase.com](https://supabase.com)
2. Нажмите "New project"
3. Выберите организацию и введите название проекта (например: "shiftmanager")
4. Выберите регион (рекомендую Europe West)
5. Создайте надежный пароль для базы данных
6. Нажмите "Create new project"

### 2. 📊 Выполнить миграции базы данных

1. В проекте Supabase перейдите в **SQL Editor**
2. Скопируйте и выполните содержимое файла `migrations/0000_silly_iron_monger.sql`
3. Нажмите "Run" для выполнения SQL

### 3. 🔑 Получить переменные окружения

В Supabase проекте найдите эти значения:

#### DATABASE_URL
- **Путь:** Settings → Database → Connection string → URI
- **Выберите:** "Session pooler" (для продакшена)
- **Формат:** `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

#### SUPABASE_URL  
- **Путь:** Settings → API → Project URL
- **Формат:** `https://[project-id].supabase.co`

#### SUPABASE_ANON_KEY
- **Путь:** Settings → API → Project API keys
- **Найти:** Ключ с пометкой `anon` `public`

#### SUPABASE_SERVICE_ROLE_KEY ⚠️
- **Путь:** Settings → API → Project API keys  
- **Найти:** Ключ с пометкой `service_role` `secret`
- **⚠️ ВАЖНО:** Это секретный ключ с полным доступом!

### 4. 🔧 Добавить переменные в Vercel

1. Зайдите на [vercel.com](https://vercel.com)
2. Откройте проект `timeout`
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте каждую переменную:

```
DATABASE_URL = [ваше значение из Supabase]
SUPABASE_URL = [ваше значение из Supabase]  
SUPABASE_ANON_KEY = [ваше значение из Supabase]
SUPABASE_SERVICE_ROLE_KEY = [ваше значение из Supabase]
NODE_ENV = production
```

### 5. 🚀 Перезапустить деплой

После добавления переменных:
1. В Vercel перейдите на вкладку **Deployments**
2. Найдите последний деплой
3. Нажмите ⋯ → **Redeploy**

## ✅ ПРОВЕРКА РАБОТЫ

После настройки проверьте:

- 🌐 **Сайт:** https://timeout-ci9enz2qx-outtime.vercel.app
- 🔗 **API:** https://timeout-ci9enz2qx-outtime.vercel.app/api/companies
- ➕ **Регистрация:** Попробуйте зарегистрировать администратора

## 🤖 ОПЦИОНАЛЬНО: Telegram бот

Если хотите настроить Telegram интеграцию:

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен
3. Добавьте в Vercel переменные:
   ```
   TELEGRAM_BOT_TOKEN = [токен от BotFather]
   TELEGRAM_BOT_USERNAME = [имя бота без @]
   ```

## 🆘 НУЖНА ПОМОЩЬ?

Если что-то не получается:
1. Проверьте логи в Vercel Dashboard → Functions
2. Убедитесь что все переменные добавлены правильно
3. Проверьте что миграции выполнены в Supabase

**Готово! После этих шагов ваш ShiftManager будет полностью работать! 🎉**