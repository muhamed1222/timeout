#!/bin/bash

# Скрипт для добавления текущего IP в Supabase allowlist
# Проект: chkziqbxvdzwhlucfrza

echo "🔍 Определение вашего IP адреса..."

# Получаем IPv4
IPV4=$(curl -s -4 https://api.ipify.org 2>/dev/null || curl -s https://api.ipify.org)

if [ -z "$IPV4" ]; then
    echo "❌ Не удалось определить IP адрес"
    exit 1
fi

echo "✅ Ваш IPv4 адрес: $IPV4"
echo ""
echo "📝 Инструкция по добавлению IP в Supabase:"
echo ""
echo "1. Откройте в браузере:"
echo "   https://supabase.com/dashboard/project/chkziqbxvdzwhlucfrza/settings/database"
echo ""
echo "2. Найдите раздел 'Connection Pooling' или 'Network Restrictions'"
echo ""
echo "3. Нажмите 'Add IP address' или 'Add current IP'"
echo ""
echo "4. Добавьте этот IP адрес:"
echo "   ✅ $IPV4"
echo ""
echo "5. Сохраните изменения (Save/Save changes)"
echo ""
echo "6. Подождите 1-2 минуты для применения изменений"
echo ""
echo "7. Проверьте подключение:"
echo "   npm run db:health"
echo ""

# Пытаемся открыть страницу в браузере (macOS)
if command -v open &> /dev/null; then
    read -p "Открыть страницу настроек Supabase в браузере? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://supabase.com/dashboard/project/chkziqbxvdzwhlucfrza/settings/database"
        echo "✅ Страница открыта в браузере"
    fi
fi

echo ""
echo "💡 Совет: После добавления IP подождите 1-2 минуты перед проверкой подключения"

