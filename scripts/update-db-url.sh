#!/bin/bash

# Скрипт для обновления DATABASE_URL в .env
# Использование: ./scripts/update-db-url.sh "postgresql://..."

if [ -z "$1" ]; then
  echo "❌ Ошибка: Нужно передать новый DATABASE_URL"
  echo ""
  echo "Использование:"
  echo "  ./scripts/update-db-url.sh 'postgresql://postgres.user:password@host:5432/postgres'"
  echo ""
  echo "Или:"
  echo "  1. Получите Connection String из Supabase Dashboard"
  echo "  2. Settings → Database → Connection string → Direct connection"
  echo "  3. Выполните: ./scripts/update-db-url.sh \"<скопированный_connection_string>\""
  exit 1
fi

NEW_URL="$1"

# Создаем резервную копию
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Обновляем DATABASE_URL
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env
else
  # Linux
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env
fi

echo "✅ DATABASE_URL обновлен!"
echo ""
echo "Старый URL: $(grep "^DATABASE_URL=" .env.backup.* 2>/dev/null | tail -1 | cut -d'=' -f2 | sed 's/:[^:@]*@/:***@/g')"
echo "Новый URL: $(echo "$NEW_URL" | sed 's/:[^:@]*@/:***@/g')"
echo ""
echo "🔄 Перезапустите сервер: npm run dev"

