# 🚀 Руководство по развертыванию исправлений

Этот документ описывает пошаговый процесс развертывания всех исправлений из [FIXES_IMPLEMENTED.md](./FIXES_IMPLEMENTED.md).

---

## 📋 Предварительные требования

- Node.js 18+ установлен
- PostgreSQL база данных доступна
- Доступ к серверу (SSH или локально)
- Переменные окружения настроены

---

## 🔧 Шаг 1: Подготовка

### 1.1 Создайте резервную копию БД

```bash
# Экспорт текущей БД
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Или через Supabase CLI (если используете Supabase)
supabase db dump -f backup.sql
```

### 1.2 Убедитесь, что код обновлён

```bash
# Получить последние изменения
git pull origin main

# Проверить статус
git status

# Должны быть изменены:
# - server/services/shiftMonitor.ts
# - server/services/scheduler.ts (новый)
# - server/routes.ts
# - server/telegram/handlers/shiftActions.ts
# - server/index.ts
# - shared/schema.ts
# - migrations/0002_add_violation_id_to_exception.sql (новый)
```

### 1.3 Установите зависимости

```bash
npm install
```

---

## 🗄️ Шаг 2: Применение миграций БД

### Вариант A: Автоматически через Drizzle Kit (рекомендуется)

```bash
npm run db:push
```

### Вариант B: Вручную через psql

```bash
psql $DATABASE_URL -f migrations/0002_add_violation_id_to_exception.sql
```

### 2.1 Проверка миграции

```sql
-- Подключитесь к БД
psql $DATABASE_URL

-- Проверьте, что поле добавлено
\d exception

-- Должно появиться:
-- violation_id | uuid |  |  |

-- Проверьте foreign key
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'exception'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Должно вернуть:
-- exception_violation_id_violations_id_fk | exception | violation_id | violations | id
```

---

## 🔨 Шаг 3: Компиляция кода

### 3.1 Проверка TypeScript

```bash
npm run check
```

Все типы должны пройти проверку без ошибок.

### 3.2 Сборка production версии (опционально)

```bash
npm run build
```

---

## 🚀 Шаг 4: Запуск сервера

### Development (локально)

```bash
npm run dev
```

### Production

```bash
# Установить переменные окружения
export NODE_ENV=production
export PORT=5000
export DATABASE_URL="your_database_url"
export TELEGRAM_BOT_TOKEN="your_bot_token"

# Запустить
npm start
```

### С PM2 (рекомендуется для production)

```bash
# Установить PM2 глобально (если ещё нет)
npm install -g pm2

# Запустить с PM2
pm2 start npm --name "timeout-app" -- start

# Сохранить конфигурацию
pm2 save

# Настроить автозапуск
pm2 startup
```

---

## ✅ Шаг 5: Проверка работоспособности

### 5.1 Проверьте логи сервера

```bash
# Если используете PM2
pm2 logs timeout-app

# Должны появиться строки:
# ✓ "serving on port 5000"
# ✓ "Schedulers started"
# ✓ "Shift monitoring started (interval: 5 minutes)"
# ✓ "Reminders sending started (interval: 1 minutes)"
```

### 5.2 Проверьте автоматический мониторинг

Через 5 минут после запуска в логах должно появиться:

```
✓ "Running global shift monitoring..."
✓ "Shift monitoring completed: X companies, Y violations, Z exceptions"
```

### 5.3 Тестовый сценарий

#### A. Создать правило нарушения

```bash
curl -X POST http://localhost:5000/api/rating/rules \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "YOUR_COMPANY_ID",
    "code": "late",
    "name": "Опоздание на смену",
    "penalty_percent": "5",
    "auto_detectable": true,
    "is_active": true
  }'
```

#### B. Создать смену (которая начнётся в прошлом)

```bash
curl -X POST http://localhost:5000/api/shifts \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "YOUR_EMPLOYEE_ID",
    "planned_start_at": "2025-10-26T09:00:00Z",
    "planned_end_at": "2025-10-26T17:00:00Z",
    "status": "planned"
  }'
```

#### C. Подождать 5 минут для автоматического мониторинга

Или запустить вручную:

```bash
curl -X POST http://localhost:5000/api/companies/YOUR_COMPANY_ID/monitor
```

#### D. Проверить, что создались exception и violation

```bash
# Проверить exceptions
curl http://localhost:5000/api/companies/YOUR_COMPANY_ID/exceptions

# Проверить violations
curl http://localhost:5000/api/rating/employees/YOUR_EMPLOYEE_ID/violations

# Проверить рейтинг
curl "http://localhost:5000/api/rating/employees/YOUR_EMPLOYEE_ID?periodStart=2025-10-01&periodEnd=2025-10-31"
```

### 5.4 Проверьте cache invalidation

#### A. Откройте Dashboard в браузере

```
http://localhost:5000
```

#### B. Запомните значения статистики

#### C. Начните смену через Telegram бота

Нажмите "▶️ Начать смену"

#### D. Обновите Dashboard

Статистика `activeShifts` должна увеличиться на 1.

---

## 🔍 Шаг 6: Мониторинг в production

### 6.1 Настройте логирование

Убедитесь, что логи сохраняются:

```bash
# С PM2
pm2 logs timeout-app --lines 100

# Или перенаправьте в файл
pm2 start npm --name "timeout-app" -- start --log-date-format "YYYY-MM-DD HH:mm:ss"
```

### 6.2 Мониторинг health check

Добавьте в crontab проверку доступности:

```bash
# Каждые 5 минут проверять, что сервер отвечает
*/5 * * * * curl -f http://localhost:5000/ || systemctl restart timeout-app
```

### 6.3 Алерты для критических событий

Настройте уведомления (например, через Telegram) при:

- Ошибках мониторинга
- Падении сервера
- Критическом количестве violations

---

## 🔄 Шаг 7: Откат изменений (если нужно)

### 7.1 Откат кода

```bash
# Вернуться к предыдущему коммиту
git revert HEAD

# Или к конкретному коммиту
git revert <commit_hash>

# Перезапустить сервер
pm2 restart timeout-app
```

### 7.2 Откат миграции БД

```sql
-- Подключиться к БД
psql $DATABASE_URL

-- Удалить constraint и column
ALTER TABLE "exception" DROP CONSTRAINT IF EXISTS "exception_violation_id_violations_id_fk";
DROP INDEX IF EXISTS "idx_exception_violation_id";
ALTER TABLE "exception" DROP COLUMN IF EXISTS "violation_id";
```

### 7.3 Восстановление из резервной копии

```bash
# Полное восстановление БД
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Шаг 8: Метрики и оптимизация

### 8.1 Мониторинг производительности

```sql
-- Проверить количество обработанных violations
SELECT COUNT(*) FROM violations WHERE source = 'auto';

-- Проверить количество exceptions с violation_id
SELECT COUNT(*) FROM exception WHERE violation_id IS NOT NULL;

-- Среднее время выполнения мониторинга (из логов)
-- "Shift monitoring completed" время в логах
```

### 8.2 Оптимизация интервалов

Если мониторинг работает слишком часто или слишком редко, измените в `server/services/scheduler.ts`:

```typescript
// Изменить интервалы
startAll(): void {
  this.startShiftMonitoring(10); // Каждые 10 минут вместо 5
  this.startRemindersSending(5); // Каждые 5 минут вместо 1
}
```

Перезапустите сервер после изменений.

---

## ⚠️ Важные замечания

1. **Graceful Shutdown**: Сервер корректно завершает все фоновые задачи при остановке
2. **Backward Compatible**: Все изменения обратно совместимы
3. **Non-Breaking**: Миграция не влияет на существующие данные
4. **Idempotent**: Миграцию можно безопасно применять повторно (она проверяет существование)

---

## 🆘 Troubleshooting

### Проблема: Scheduler не запускается

**Симптомы**: В логах нет "Schedulers started"

**Решение**:

```bash
# Проверить, что сервер запущен
ps aux | grep node

# Проверить логи
pm2 logs timeout-app

# Перезапустить
pm2 restart timeout-app
```

### Проблема: Миграция не применяется

**Симптомы**: Ошибка "column already exists" или "table does not exist"

**Решение**:

```bash
# Проверить состояние БД
psql $DATABASE_URL -c "\d exception"

# Если violation_id уже есть - миграция применена
# Если нет - применить вручную
psql $DATABASE_URL -f migrations/0002_add_violation_id_to_exception.sql
```

### Проблема: Violations не создаются автоматически

**Симптомы**: exceptions создаются, но violations нет

**Решение**:

1. Проверьте, что правила нарушений созданы:
   ```bash
   curl http://localhost:5000/api/rating/companies/YOUR_COMPANY_ID/rules
   ```
2. Убедитесь, что правило активно (`is_active: true`)
3. Проверьте mapping в `shiftMonitor.ts` (строка 213-219)
4. Проверьте логи на ошибки

### Проблема: Cache не инвалидируется

**Симптомы**: Dashboard показывает устаревшую статистику

**Решение**:

1. Проверьте, что import cache присутствует
2. Перезапустите сервер
3. Очистите cache браузера (Ctrl+Shift+R)

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `pm2 logs timeout-app`
2. Проверьте БД: `psql $DATABASE_URL`
3. Проверьте документацию: [FIXES_IMPLEMENTED.md](./FIXES_IMPLEMENTED.md)
4. Создайте issue в репозитории с логами и описанием проблемы

---

## ✅ Чеклист развертывания

- [ ] Создана резервная копия БД
- [ ] Получены последние изменения из git
- [ ] Установлены зависимости (`npm install`)
- [ ] Применена миграция 0002
- [ ] Проверена компиляция TypeScript
- [ ] Запущен сервер
- [ ] Проверены логи (Schedulers started)
- [ ] Протестирован автоматический мониторинг
- [ ] Проверена cache invalidation
- [ ] Настроен production мониторинг
- [ ] Документация обновлена

---

**Дата последнего обновления**: 26 октября 2025
**Версия**: 1.0
**Статус**: Готово к production
