# 🔐 Secrets Management - Production Setup

## Overview

Проект поддерживает AWS Secrets Manager для безопасного хранения секретов в production.

## 🚀 Quick Start

### Development

В development режиме используются переменные окружения из `.env`:

```bash
cp .env.example .env
# Заполните .env с вашими значениями
npm run dev
```

### Production

В production секреты загружаются из AWS Secrets Manager автоматически.

## 📋 Настройка AWS Secrets Manager

### 1. Создание Secret в AWS

```bash
# Создайте JSON файл с секретами
cat > secrets.json << EOF
{
  "DATABASE_URL": "postgresql://user:pass@host:5432/db",
  "TELEGRAM_BOT_TOKEN": "123456789:ABC...",
  "BOT_API_SECRET": "your-32-char-secret-here",
  "SUPABASE_URL": "https://your-project.supabase.co",
  "SUPABASE_ANON_KEY": "your-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
  "REDIS_URL": "redis://host:6379",
  "SENTRY_DSN": "https://your-sentry-dsn@sentry.io/project-id"
}
EOF

# Создайте secret в AWS
aws secretsmanager create-secret \
  --name shiftmanager/production \
  --description "Shift Manager Production Secrets" \
  --secret-string file://secrets.json \
  --region us-east-1
```

### 2. Настройка IAM Policy

Приложение требует следующих IAM прав:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:shiftmanager/*"
    }
  ]
}
```

### 3. Переменные окружения для AWS

Установите следующие переменные окружения (или используйте IAM role):

```bash
# Вариант 1: Переменные окружения
export AWS_REGION=us-east-1
export AWS_SECRETS_MANAGER_SECRET_NAME=shiftmanager/production
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

# Вариант 2: IAM Role (рекомендуется для EC2/ECS/Lambda)
# Ничего не нужно - права берутся из IAM role
```

### 4. Запуск приложения

Приложение автоматически загрузит секреты из AWS Secrets Manager при старте:

```bash
npm start
```

## 🔄 Rotation (Ротация секретов)

### Автоматическая ротация

Настройте автоматическую ротацию в AWS Secrets Manager через Lambda функцию.

### Ручная ротация

```bash
# Обновите secret в AWS
aws secretsmanager put-secret-value \
  --secret-id shiftmanager/production \
  --secret-string file://secrets.json

# Приложение автоматически подхватит новые значения при следующем запросе
# (кэш обновляется каждые 5 минут)
```

## 📝 Переменные окружения

### Обязательные

- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token
- `BOT_API_SECRET` - API Secret (минимум 32 символа)
- `NODE_ENV` - `production` для production

### Опциональные

- `AWS_REGION` - AWS Region (default: `us-east-1`)
- `AWS_SECRETS_MANAGER_SECRET_NAME` - Secret name (default: `shiftmanager/production`)
- `REDIS_URL` - Redis connection string
- `SENTRY_DSN` - Sentry DSN для мониторинга
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase credentials

## 🔍 Отладка

### Проверка загрузки секретов

```typescript
import { getRedactedSecrets } from './lib/secrets.js';

const secrets = getRedactedSecrets();
console.log('Loaded secrets:', secrets);
```

### Логи

Приложение логирует источник секретов при загрузке:

```
INFO: Loading secrets from AWS Secrets Manager
INFO: Secrets loaded and validated successfully { source: 'AWS Secrets Manager' }
```

## 🛡️ Безопасность

1. **Никогда не коммитьте `.env` файлы**
2. **Используйте IAM roles вместо Access Keys когда возможно**
3. **Ротируйте секреты регулярно** (каждые 90 дней)
4. **Минимум 32 символа для `BOT_API_SECRET`**
5. **Включите версионирование в AWS Secrets Manager**

## 📚 Дополнительная документация

- [AWS Secrets Manager Guide](https://docs.aws.amazon.com/secretsmanager/)
- [SECRETS_MANAGEMENT_GUIDE.md](../SECRETS_MANAGEMENT_GUIDE.md) - Полный гайд



