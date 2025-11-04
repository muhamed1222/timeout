#!/bin/bash

# Скрипт для обновления импортов UI компонентов
# Заменяет @/components/ui/ на @/ui/ во всех файлах

echo "Обновление импортов UI компонентов..."

# Находим все файлы с импортами @/components/ui/
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|@/components/ui/|@/ui/|g' {} +

echo "Импорты обновлены!"
echo "Проверьте изменения с помощью: git diff"

