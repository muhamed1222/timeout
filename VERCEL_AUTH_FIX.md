# 🔒 ИСПРАВЛЕНИЕ: Vercel требует аутентификацию

## Проблема
Ваш сайт показывает страницу "Authentication Required" вместо приложения.

## 🔧 Решение

### 1. Отключить Vercel Authentication

1. Зайдите на [vercel.com](https://vercel.com)
2. Откройте проект `timeout`
3. Перейдите в **Settings** → **Deployment Protection**
4. Найдите раздел **Vercel Authentication**
5. **Отключите** защиту (выберите "None" или "Disabled")
6. Сохраните изменения

### 2. Проверить настройки проекта

Убедитесь что:
- ✅ **Environment Variables** настроены правильно
- ✅ **Deployment Protection** отключена
- ✅ Проект имеет статус "Public" (не приватный)

### 3. Перезапустить деплой

После изменения настроек:
1. Перейдите на вкладку **Deployments**  
2. Найдите последний деплой
3. Нажмите ⋯ → **Redeploy**

## ✅ Результат

После отключения защиты:
- 🌐 **Сайт:** https://timeout-ci9enz2qx-outtime.vercel.app - будет открываться
- 🔗 **API:** https://timeout-ci9enz2qx-outtime.vercel.app/api/companies - будет отвечать

## 🚨 Альтернативное решение

Если защита нужна, то можно:
1. Добавить домены в белый список
2. Использовать функцию bypass для API
3. Настроить отдельные правила для /api/* путей

## 📋 Проверка после исправления

```bash
# Проверить что сайт открывается:
curl -I https://timeout-ci9enz2qx-outtime.vercel.app

# Проверить что API работает:
curl https://timeout-ci9enz2qx-outtime.vercel.app/api/companies
```

Должен возвращать JSON вместо HTML страницы аутентификации.