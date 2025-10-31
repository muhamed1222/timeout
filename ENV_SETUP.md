# Настройка переменных окружения

## Шаг 1: Создание .env файла

Скопируйте файл `env.example` в `.env`:

```bash
cp env.example .env
```

## Шаг 2: Заполнение обязательных переменных

Отредактируйте файл `.env` и заполните следующие переменные:

### Обязательные переменные:

1. **DATABASE_URL** - URL подключения к PostgreSQL базе данных
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/timeout_db
   ```

2. **SUPABASE_URL** - URL вашего Supabase проекта
   ```
   SUPABASE_URL=https://your-project.supabase.co
   ```

3. **SUPABASE_ANON_KEY** - Анонимный ключ Supabase
   ```
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **SUPABASE_SERVICE_ROLE_KEY** - Сервисный ключ Supabase
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### Безопасность:

5. **JWT_SECRET** - Секретный ключ для JWT токенов (уже сгенерирован)
   ```
   JWT_SECRET=5A5qR3vpFqMeoWNlqIppxpvQHKWmgDNnJJFO0sbRx/M=
   ```

6. **CSRF_SECRET** - Секретный ключ для CSRF защиты (уже сгенерирован)
   ```
   CSRF_SECRET=MwPKb21Jd8KoQCX+7Cd3oq6kAA/tILTNpgiGZEueUOw=
   ```

### Опциональные переменные:

7. **TELEGRAM_BOT_TOKEN** - Токен Telegram бота (если используется)
   ```
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
   ```

## Шаг 3: Проверка конфигурации

После заполнения всех переменных, проверьте конфигурацию:

```bash
npm run test:config
```

## Шаг 4: Применение миграций базы данных

```bash
npm run db:push
```

## Важные замечания:

1. **Никогда не коммитьте .env файл в git!**
2. Используйте разные ключи для development и production
3. Регулярно ротируйте секретные ключи
4. Для production используйте HTTPS для всех URL

## Для production:

Установите следующие переменные:
```
NODE_ENV=production
DEBUG=false
# Используйте HTTPS для всех URL
```



