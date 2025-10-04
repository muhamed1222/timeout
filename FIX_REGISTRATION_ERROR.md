# 🔧 ИСПРАВЛЕНИЕ: ОШИБКА 500 ПРИ РЕГИСТРАЦИИ

## 📋 ПРОБЛЕМА
При попытке регистрации появляется ошибка:
```
POST https://timeout-lac.vercel.app/api/auth/register 500 (Internal Server Error)
```

## 🔍 АНАЛИЗ
Ошибка возникает из-за отсутствия переменной окружения `SUPABASE_SERVICE_ROLE_KEY`, которая необходима для:
- Создания пользователей через Admin API
- Регистрации администраторов компаний
- Операций с повышенными привилегиями

## ✅ РЕШЕНИЕ

### 1. Добавить недостающие переменные в Vercel

Зайдите на [vercel.com](https://vercel.com) → ваш проект → **Settings** → **Environment Variables**

Добавьте следующие переменные:

#### Обязательные переменные:
```
# Frontend (для клиентского приложения)
VITE_SUPABASE_URL = https://chkziqbxvdzwhlucfrza.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94
NEXT_PUBLIC_SUPABASE_URL = https://chkziqbxvdzwhlucfrza.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94

# Backend (для серверных функций)
SUPABASE_URL = https://chkziqbxvdzwhlucfrza.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQxMDU0NywiZXhwIjoyMDc0OTg2NTQ3fQ.wKTHzQiAa4kjNhtFmTR9lYy2LdFki-CoJQKJjmOw8E8
DATABASE_URL = postgresql://postgres.chkziqbxvdzwhlucfrza:S2ljE6NzGIAJAjtn@aws-1-eu-west-2.pooler.supabase.com:6543/postgres
```

#### Опциональные переменные (для Telegram):
```
TELEGRAM_BOT_TOKEN = 8472138192:AAGMrm0l1HrZIzZJYHQP46RK_SrHmauHZ3M
TELEGRAM_BOT_USERNAME = @outworkru_bot
```

### 2. Перезапустить деплой

После добавления переменных:
1. Перейдите на вкладку **Deployments**
2. Найдите последний деплой
3. Нажмите ⋯ → **Redeploy**

## 🧪 ПРОВЕРКА

После деплоя:
1. Откройте сайт: https://timeout-lac.vercel.app/
2. Попробуйте зарегистрироваться
3. Проверьте Network tab в DevTools - запрос к `/api/auth/register` должен вернуть 200 OK

## 📝 ПОЯСНЕНИЕ

Обновленный код теперь:
- Поддерживает различные форматы переменных окружения
- Добавляет подробные сообщения об ошибках
- Проверяет наличие всех необходимых переменных
- Логирует предупреждения при отсутствии критических переменных

## 🚨 ЧАСТЫЕ ПРОБЛЕМЫ

### Если ошибка продолжается:
1. **Проверьте логи Vercel:** Dashboard → Functions → выберите функцию → Logs
2. **Убедитесь что миграции выполнены:** В Supabase SQL Editor выполните содержимое `migrations/0000_silly_iron_monger.sql`
3. **Проверьте права доступа:** Убедитесь что Supabase Service Role Key имеет полный доступ

### Если появляется ошибка "User already registered":
Это нормально - значит пользователь уже создан. Попробуйте другой email или используйте вход.

## 🎯 ГОТОВО!

После выполнения этих шагов регистрация должна работать корректно!