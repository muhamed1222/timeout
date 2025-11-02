# 🔧 Настройка Supabase для OAuth

## ❗ Важно

Для работы Yandex OAuth **обязательно нужны** переменные Supabase в `.env.local`:

```env
# Supabase
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Для фронтенда (те же значения)
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Yandex OAuth
YANDEX_CLIENT_ID=ваш_client_id
YANDEX_CLIENT_SECRET=ваш_client_secret
```

---

## 📋 Шаг 1: Создайте проект в Supabase

1. Перейдите на https://supabase.com
2. Зарегистрируйтесь или войдите
3. Нажмите "New Project"
4. Заполните:
   - **Name**: timeout (или любое имя)
   - **Database Password**: придумайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион
5. Нажмите "Create new project"
6. Дождитесь создания (1-2 минуты)

---

## 📋 Шаг 2: Получите ключи Supabase

После создания проекта:

1. Перейдите в **Settings** (шестеренка слева внизу)
2. Выберите **API** в меню слева
3. Скопируйте:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Шаг 3: Добавьте в .env.local

Откройте файл `.env.local` в корне проекта и добавьте:

```env
# Supabase (для backend)
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Supabase (для frontend)
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Yandex OAuth (если уже есть — оставьте)
YANDEX_CLIENT_ID=ваш_client_id
YANDEX_CLIENT_SECRET=ваш_client_secret
```

⚠️ **Важно:** `VITE_` переменные нужны для фронтенда (React), обычные — для бэкенда (Node.js).

---

## 📋 Шаг 4: Настройте Auth в Supabase

1. Перейдите в **Authentication** → **Providers**
2. Найдите **Email** и включите его (если не включен)
3. Настройте **Site URL**:
   - Перейдите в **Authentication** → **URL Configuration**
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: добавьте:
     - `http://localhost:5173/**`
     - `http://localhost:3001/**`

---

## 📋 Шаг 5: Создайте таблицы (если нужно)

Если база данных пустая, создайте таблицы:

```bash
npm run db:push
```

Или вручную через Supabase SQL Editor:

1. Перейдите в **SQL Editor**
2. Создайте таблицу `company`:

```sql
CREATE TABLE IF NOT EXISTS company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 📋 Шаг 6: Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C)
# Запустите заново
npm run dev
```

---

## ✅ Проверьте настройку

После перезапуска сервера проверьте логи:

### В терминале должно быть:

```
✅ Supabase connected
✅ Service role key available
```

### Если видите предупреждения:

```
⚠️ SUPABASE_URL or VITE_SUPABASE_URL is not set
⚠️ SUPABASE_SERVICE_ROLE_KEY is not set - Admin API operations may be limited
```

Значит, переменные не загрузились — проверьте `.env.local`.

---

## 🧪 Тестирование

После настройки попробуйте:

1. **Ручной вход** (если создали пользователя):
   - Перейдите на `/login`
   - Нажмите "Ввести почту вручную"
   - Войдите с demo@timeout.app / Demo1234!

2. **Yandex OAuth**:
   - Нажмите "Войти через Яндекс"
   - Если все настроено — должно пройти успешно

---

## ❓ Частые проблемы

### 1. "SUPABASE_URL is not set"

**Решение:** Проверьте, что в `.env.local` есть строка:
```env
SUPABASE_URL=https://...
```

### 2. "Admin API operations may be limited"

**Решение:** Добавьте `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 3. "Invalid JWT" при входе

**Решение:** 
- Проверьте, что `SUPABASE_ANON_KEY` и `VITE_SUPABASE_ANON_KEY` совпадают
- Проверьте, что они скопированы полностью (ключи очень длинные!)

### 4. "User not found"

**Решение:** Создайте демо-пользователя:
```bash
npm run create-demo-admin
```

---

## 📝 Итоговый .env.local

Полный пример `.env.local`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/timeout

# Supabase (Backend)
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MTU2MDAwMDB9.xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyMyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkxNTYwMDAwMH0.yyy

# Supabase (Frontend)
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyMyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MTU2MDAwMDB9.xxx

# Yandex OAuth
YANDEX_CLIENT_ID=ваш_client_id_от_яндекса
YANDEX_CLIENT_SECRET=ваш_client_secret_от_яндекса

# Telegram (опционально)
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token
TELEGRAM_BOT_USERNAME=@ваш_бот

# API
BOT_API_SECRET=32_символа_случайной_строки_для_безопасности
```

---

Все готово! После добавления этих переменных OAuth через Яндекс должен заработать. 🎉

