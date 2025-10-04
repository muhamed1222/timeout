#!/bin/bash

# 🚨 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ VERCEL ДЕПЛОЯ

echo "🔧 Исправляем vercel.json для устранения ошибки сборки..."

# Создаем правильный vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist/public",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF

echo "✅ Файл vercel.json исправлен!"

# Коммитим изменения
git add vercel.json
git commit -m "Fix: Remove invalid functions config from vercel.json

- Remove functions section with runtime config that causes Vercel build failure
- Vercel will auto-detect runtime for API functions
- This should resolve: Function Runtimes must have a valid version error"

echo "📤 Пушим изменения в GitHub..."
git push

echo "🎉 ГОТОВО! Vercel автоматически перезапустит деплой."
echo "🌐 Ваш сайт: https://timeout-ci9enz2qx-outtime.vercel.app"
echo "🔗 API: https://timeout-ci9enz2qx-outtime.vercel.app/api/companies"