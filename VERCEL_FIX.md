# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ: Build Failed на Vercel

## Проблема
```
Build Failed
Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

## 🔧 Быстрое решение

### 1. Обновите vercel.json

Замените содержимое файла `vercel.json` на:

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

### 2. Убедитесь что api/index.js корректный

Файл `api/index.js` должен заканчиваться на:

```javascript
module.exports = async function handler(req, res) {
  try {
    const expressApp = await initializeApp();
    
    // Передаем запрос в Express app
    expressApp(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
```

### 3. Коммит и пуш

```bash
git add .
git commit -m "Fix: Remove invalid function runtime config from vercel.json"
git push
```

### 4. Перезапустите деплой

Vercel автоматически перезапустит деплой после пуша. Если не запустился:
- Зайдите в [vercel.com](https://vercel.com)
- Откройте ваш проект
- Нажмите "Redeploy" для последнего коммита

## ✅ Результат

После исправления:
- Build должен пройти успешно
- API будет доступен по адресу: `https://your-app.vercel.app/api/*`
- Frontend будет доступен: `https://your-app.vercel.app`

## 🔍 Причина проблемы

Vercel не поддерживает конфигурацию `"runtime": "nodejs20.x"` в секции `functions`. Вместо этого Vercel автоматически определяет runtime для файлов в папке `api/`.