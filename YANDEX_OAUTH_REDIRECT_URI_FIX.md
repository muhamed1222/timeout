# ⚠️ ВАЖНО: Исправление Redirect URI в настройках Yandex

## Проблема

В настройках вашего Yandex приложения указан неправильный Redirect URI:
```
https://chkziqbxvdzwhlucfrza.supabase.co/auth/v1/callback
```

Это адрес Supabase, но наш OAuth обрабатывается на сервере, поэтому нужен другой адрес.

## Решение

### 1. Для локальной разработки

В настройках Yandex приложения измените Redirect URI на:
```
http://localhost:5000/api/auth/yandex/callback
```

### 2. Для продакшена

Когда будете деплоить на продакшен, измените Redirect URI на:
```
https://yourdomain.com/api/auth/yandex/callback
```

(Замените `yourdomain.com` на ваш реальный домен)

## Как изменить Redirect URI в Yandex

1. Перейдите на [https://oauth.yandex.ru/](https://oauth.yandex.ru/)
2. Откройте ваше приложение "OutTime"
3. Найдите поле **"Redirect URI"** в разделе "Платформы"
4. Измените на: `http://localhost:5000/api/auth/yandex/callback`
5. Сохраните изменения

## Почему это важно?

Наш серверный endpoint (`/api/auth/yandex/callback`) обрабатывает весь OAuth поток:
- Получает код от Яндекс
- Обменивает код на токен
- Получает данные пользователя
- Создает пользователя в Supabase
- Генерирует сессию

Supabase callback (`/auth/v1/callback`) этого делать не умеет, поэтому OAuth не будет работать с текущим Redirect URI.

## Проверка

После изменения Redirect URI:
1. Перезапустите сервер
2. Попробуйте войти через Яндекс
3. Должно произойти перенаправление на Яндекс, затем обратно в приложение

---

**⚠️ Не забудьте изменить Redirect URI в настройках Yandex приложения!**

