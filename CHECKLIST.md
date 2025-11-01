# ✅ Deployment Checklist

Complete this checklist before deploying to production.

> **Note:** This checklist consolidates content from:
> - `DEPLOYMENT_CHECKLIST.md`
> - `DEPLOYMENT_FINAL_CHECKLIST.md`
> - `IMPROVEMENTS_CHECKLIST.md`

## 🔍 Автоматическая проверка

Запустите скрипт проверки:
```bash
npx tsx scripts/verify-deployment.ts
```

## 📋 Ручная проверка

### 1. Vercel — Environment Variables

**Путь:** Vercel Dashboard → Ваш проект → Settings → Environment Variables

#### Обязательные переменные:

- ✅ **DATABASE_URL**
  - Значение: `postgresql://postgres.chkziqbxvdzwhlucfrza:S2ljE6NzGIAJAjtn@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`
  - Окружение: Production (и желательно Preview, Development)

- ✅ **SUPABASE_URL**
  - Значение: `https://chkziqbxvdzwhlucfrza.supabase.co` (замените на ваш)
  - Где найти: Supabase Dashboard → Settings → API → Project URL

- ✅ **SUPABASE_ANON_KEY**
  - Значение: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon/public key)
  - Где найти: Supabase Dashboard → Settings → API → anon public

- ✅ **SUPABASE_SERVICE_ROLE_KEY**
  - Значение: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role key)
  - Где найти: Supabase Dashboard → Settings → API → service_role key
  - ⚠️ ВАЖНО: Не показывайте этот ключ публично!

- ✅ **NODE_ENV**
  - Значение: `production`
  - Окружение: Production

#### Опциональные переменные:

- **TELEGRAM_BOT_TOKEN** (если используется Telegram бот)
- **TELEGRAM_BOT_USERNAME** (если используется Telegram бот)

#### ⚠️ После добавления переменных:

1. Убедитесь, что переменные добавлены для **Production** окружения
2. Нажмите **"Redeploy"** (или сделайте новый коммит)
3. Проверьте логи деплоя

---

### 2. Supabase — Проверка базы данных

**Путь:** Supabase Dashboard → SQL Editor

#### Проверка таблиц:

Выполните запрос:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Ожидаемые таблицы:**
- ✅ company
- ✅ employee
- ✅ shift
- ✅ work_interval
- ✅ break_interval
- ✅ daily_report
- ✅ exception
- ✅ reminder
- ✅ schedule_template
- ✅ employee_invite
- ✅ audit_log
- ✅ company_violation_rules
- ✅ violations
- ✅ employee_rating

#### Проверка данных:

```sql
-- Проверка компании
SELECT COUNT(*) FROM company;

-- Если компания отсутствует, создайте её:
INSERT INTO company (id, name, timezone, locale, privacy_settings)
VALUES (
  '9ea111ce-ad0f-4758-98cd-60a9ca876f55',
  'Demo Company',
  'Europe/Amsterdam',
  'ru',
  '{}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Проверка сотрудников
SELECT COUNT(*) FROM employee;
```

#### Проверка подключения:

**Путь:** Supabase Dashboard → Settings → Database → Connection string

- Убедитесь, что URI mode совпадает с тем, что в Vercel
- Формат: `postgresql://postgres.[ref]:[password]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`

---

### 3. Vercel — Проверка деплоя

**Путь:** Vercel Dashboard → Ваш проект → Deployments

1. ✅ Проверьте, что последний деплой успешен (зелёный статус)
2. ✅ Если деплой упал — откройте логи:
   - Нажмите на деплой → View Function Logs
   - Ищите ошибки типа:
     - `DATABASE_URL is not configured`
     - `Missing environment variables`
     - `Connection timeout`

3. ✅ Проверьте Build Logs:
   - Убедитесь, что сборка прошла без ошибок
   - Проверьте TypeScript ошибки

---

### 4. Финальная проверка

После деплоя проверьте эндпоинты:

```bash
# Проверка stats (должен вернуть 200, не 500)
curl https://timeout-lac.vercel.app/api/companies/9ea111ce-ad0f-4758-98cd-60a9ca876f55/stats

# Проверка active shifts (должен вернуть 200, не 500)
curl https://timeout-lac.vercel.app/api/companies/9ea111ce-ad0f-4758-98cd-60a9ca876f55/shifts/active

# Проверка главной страницы
curl https://timeout-lac.vercel.app/
```

**Ожидаемый результат:**
- ✅ Все запросы возвращают 200 OK
- ✅ JSON ответы корректны
- ✅ Нет ошибок в консоли браузера

---

## 🔧 Troubleshooting

### Проблема: 500 ошибка на `/api/companies/:id/stats`

**Решение:**
1. Проверьте, что `DATABASE_URL` установлен в Vercel
2. Проверьте логи деплоя на ошибки подключения
3. Убедитесь, что база данных доступна (не на паузе)
4. Проверьте, что таблицы созданы в Supabase

### Проблема: "DATABASE_URL is not configured"

**Решение:**
- Добавьте `DATABASE_URL` в Environment Variables
- Убедитесь, что переменная для Production окружения
- Сделайте Redeploy

### Проблема: Connection timeout

**Решение:**
- Проверьте правильность `DATABASE_URL`
- Убедитесь, что используется Connection Pooler (порт 6543)
- Проверьте, что база не на паузе в Supabase

---

## 📝 Контрольный список

- [ ] DATABASE_URL добавлен в Vercel
- [ ] SUPABASE_URL добавлен в Vercel
- [ ] SUPABASE_ANON_KEY добавлен в Vercel
- [ ] SUPABASE_SERVICE_ROLE_KEY добавлен в Vercel
- [ ] NODE_ENV=production добавлен в Vercel
- [ ] Переменные добавлены для Production окружения
- [ ] Сделан Redeploy после добавления переменных
- [ ] Все таблицы созданы в Supabase
- [ ] Компания создана в базе (если нужно)
- [ ] Деплой успешен (зелёный статус)
- [ ] API эндпоинты возвращают 200 OK
- [ ] Нет ошибок в логах Vercel

---

**Готово!** Если все пункты отмечены — ваш деплой настроен правильно! 🎉

