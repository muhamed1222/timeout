# Database Migrations

Этот каталог содержит SQL миграции для базы данных PostgreSQL.

## Порядок применения миграций

Миграции должны применяться в порядке их номеров:

1. `0000_silly_iron_monger.sql` - Начальная схема (автоматически создана Drizzle)
2. `0001_thin_spectrum.sql` - Вторая миграция (автоматически создана Drizzle)
3. `0002_add_violation_id_to_exception.sql` - **НОВАЯ МИГРАЦИЯ** - Связь exception ↔ violation

## Как применить миграции

### Автоматически через Drizzle Kit:
```bash
npm run db:push
```

### Вручную через psql:
```bash
# Применить конкретную миграцию
psql $DATABASE_URL -f migrations/0002_add_violation_id_to_exception.sql

# Или все по порядку
psql $DATABASE_URL -f migrations/0000_silly_iron_monger.sql
psql $DATABASE_URL -f migrations/0001_thin_spectrum.sql
psql $DATABASE_URL -f migrations/0002_add_violation_id_to_exception.sql
```

## Миграция 0002: violation_id в exception

### Что добавляет:
- Поле `violation_id` в таблицу `exception`
- Foreign key constraint на `violations(id)` с ON DELETE SET NULL
- Индекс для производительности

### Зачем нужно:
Связывает таблицы `exception` и `violations`, чтобы:
- Отслеживать, какое нарушение привело к исключению
- Избежать дублирования данных
- Получать полную информацию о штрафе из violation

### Безопасность:
- ✅ Non-breaking change (nullable поле)
- ✅ Не влияет на существующие данные
- ✅ Можно откатить через DROP COLUMN

### Откат (если нужно):
```sql
ALTER TABLE "exception" DROP CONSTRAINT "exception_violation_id_violations_id_fk";
DROP INDEX "idx_exception_violation_id";
ALTER TABLE "exception" DROP COLUMN "violation_id";
```

## Проверка статуса миграций

```sql
-- Проверить, применена ли миграция
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'exception' 
  AND column_name = 'violation_id';

-- Должен вернуть одну строку с 'violation_id'
```

## Troubleshooting

### Ошибка: "column already exists"
Миграция уже применена. Пропустите её.

### Ошибка: "foreign key constraint violation"
Убедитесь, что таблица `violations` существует перед применением миграции.

### Ошибка: "permission denied"
Пользователь БД должен иметь права на ALTER TABLE.

