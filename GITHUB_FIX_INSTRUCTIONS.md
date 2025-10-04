# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ для timeout-ci9enz2qx-outtime.vercel.app

## Проблема решена! ✅

Ошибка `Function Runtimes must have a valid version` возникала из-за неправильной конфигурации в `vercel.json`.

## 🔧 Что нужно сделать:

### 1. Замените содержимое файла `vercel.json`

**Было (с ошибкой):**
```json
{
  "version": 2,
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist/public",
  "devCommand": "npm run dev",
  "framework": null,
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x"    ← ЭТА СТРОКА ВЫЗЫВАЕТ ОШИБКУ
    }
  },
  "rewrites": [...]
}
```

**Стало (правильно):**
```json
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
```

### 2. Коммит и пуш изменений

```bash
git add vercel.json
git commit -m "Fix: Remove invalid functions config from vercel.json"
git push
```

### 3. Результат

После пуша Vercel автоматически перезапустит деплой и он должен пройти успешно!

## 📋 Проверочный лист после деплоя:

- [ ] Build завершается успешно (без ошибок)
- [ ] Сайт открывается: https://timeout-ci9enz2qx-outtime.vercel.app
- [ ] API отвечает: https://timeout-ci9enz2qx-outtime.vercel.app/api/companies
- [ ] Можно зарегистрировать администратора

## 🎯 Готово!

После этого исправления ваше приложение ShiftManager будет полностью развернуто на Vercel! 🚀