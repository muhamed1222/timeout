# ✅ Финальная настройка Yandex OAuth

## Настройки в Yandex (что вы сделали)

✅ Вы добавили Redirect URI:
- `http://localhost:5000/api/auth/yandex/callback` - **НЕПРАВИЛЬНЫЙ ПОРТ!**
- `https://chkziqbxvdzwhlucfrza.supabase.co/auth/v1/callback` - можно оставить

## ⚠️ Что нужно изменить

**Важно понимать порты:**
- **Frontend (Vite)**: порт **5173** - здесь открываете приложение в браузере
- **Backend API**: порт **3001** - здесь обрабатываются API запросы, включая OAuth callback

**В Yandex настройках:**
- ❌ Удалите: `http://localhost:5000/api/auth/yandex/callback`
- ✅ Добавьте: `http://localhost:3001/api/auth/yandex/callback`

**Важно**: Callback должен идти напрямую на backend (3001), а не через frontend (5173)!

### Почему порт 3001, а не 5000?

- Frontend работает на порту **5173**
- Backend API работает на порту **3001** (см. `concurrent-dev.cjs`)
- Vite проксирует запросы `/api` с порта 5173 на порт 3001

Callback от Яндекс должен идти **напрямую на backend** (порт 3001), потому что:
- Vite прокси работает только для запросов от фронтенда
- Callback от Яндекс идет напрямую с внешнего сервиса

## Инструкция по исправлению

1. В настройках Yandex приложения:
   - Удалите: `http://localhost:5000/api/auth/yandex/callback` (нажмите X)
   - Добавьте новый: `http://localhost:3001/api/auth/yandex/callback`
   - Можно оставить Supabase URL (он не мешает)

2. Сохраните изменения

3. **Перезапустите сервер** (если не перезапускали после последних изменений):
   ```bash
   # Остановите (Ctrl+C)
   npm run dev
   ```

## Проверка

После изменений в логах сервера должно появиться:
```
✅ Yandex OAuth router module imported successfully
✅ Yandex OAuth router registered at /api/auth/yandex
Yandex OAuth callback URL: { callbackUrl: 'http://localhost:3001/api/auth/yandex/callback' }
```

## Готово!

Теперь можно тестировать:
1. Откройте `http://localhost:5173/login`
2. Нажмите "Войти через Яндекс"
3. Должно перенаправить на Yandex
4. После авторизации вернетесь в приложение

---

## Для продакшена

Когда будете деплоить на продакшен:
- Измените Redirect URI на: `https://yourdomain.com/api/auth/yandex/callback`
- Обновите `FRONTEND_URL` в переменных окружения

