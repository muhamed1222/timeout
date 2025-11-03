#!/bin/bash

# Скрипт для автоматической проверки подключения к БД
# Запускайте после добавления IP в Supabase Dashboard

echo "⏳ Ожидание подключения к базе данных..."
echo "Проверка каждые 5 секунд..."
echo ""

COUNTER=0
MAX_ATTEMPTS=24  # 2 минуты (24 * 5 секунд)

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
  echo -n "Попытка $((COUNTER + 1))/$MAX_ATTEMPTS... "
  
  # Проверяем подключение
  RESULT=$(npx tsx scripts/test-pooler.ts 2>&1 | grep -E "УСПЕХ|РАБОТАЕТ|test")
  
  if [ -n "$RESULT" ]; then
    echo ""
    echo "✅ УСПЕХ! База данных подключена!"
    echo ""
    echo "Перезапускаю сервер..."
    pkill -f "concurrent-dev|tsx.*server/index|vite" 2>/dev/null
    sleep 2
    npm run dev &
    echo ""
    echo "✅ Сервер перезапущен!"
    echo "Откройте http://localhost:5173"
    exit 0
  fi
  
  echo "❌ еще не подключено"
  sleep 5
  COUNTER=$((COUNTER + 1))
done

echo ""
echo "⏱️  Превышено время ожидания (2 минуты)"
echo "Проверьте:"
echo "1. IP адрес 45.90.13.69 добавлен в Supabase Dashboard"
echo "2. Изменения сохранены"
echo "3. Подождите еще немного и попробуйте снова"
echo ""
echo "Или проверьте вручную: npx tsx scripts/test-pooler.ts"
exit 1

