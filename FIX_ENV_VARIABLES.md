# 🔧 ИСПРАВЛЕНИЕ: ОШИБКА supabaseUrl is required

## 📋 ПРОБЛЕМА
В консоли браузера появляется ошибка:
```
Uncaught Error: supabaseUrl is required.
```

## 🔍 ПРИЧИНА
Фронтенд ожидает переменные окружения с префиксом `VITE_` или `NEXT_PUBLIC_`, но в Vercel они не настроены правильно.

## ✅ РЕШЕНИЕ

### 1. Добавить переменные в Vercel

Зайдите на [vercel.com](https://vercel.com) → ваш проект → **Settings** → **Environment Variables**

Добавьте следующие переменные:

```
VITE_SUPABASE_URL = https://ваш-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY = ваш-anon-key

NEXT_PUBLIC_SUPABASE_URL = https://ваш-supabase-url.supabase.co  
NEXT_PUBLIC_SUPABASE_ANON_KEY = ваш-anon-key
```

### 2. Переменные из вашего .env.example:

```
VITE_SUPABASE_URL = https://chkziqbxvdzwhlucfrza.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94

NEXT_PUBLIC_SUPABASE_URL = https://chkziqbxvdzwhlucfrza.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa3ppcWJ4dmR6d2hsdWNmcnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTA1NDcsImV4cCI6MjA3NDk4NjU0N30.PFjq7IZ81C5woCxoolferCZeFnkQ2xqVT96cBBR5Q94
```

### 3. Перезапустить деплой

После добавления переменных:
1. Перейдите на вкладку **Deployments**
2. Найдите последний деплой
3. Нажмите ⋯ → **Redeploy**

## 🧪 ПРОВЕРКА

После деплоя:
1. Откройте сайт: https://timeout-lac.vercel.app/
2. Откройте DevTools → Console
3. Ошибки `supabaseUrl is required` быть не должно

## 📝 ПОЯСНЕНИЕ

Код был обновлён для поддержки обеих систем переменных:
- `VITE_*` - для локальной разработки с Vite
- `NEXT_PUBLIC_*` - для деплоя на Vercel

Теперь фронтенд будет работать в обеих средах.