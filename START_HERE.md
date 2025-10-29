# 🚀 START HERE - Quick Deployment Guide

> **Проект готов к deployment!** Следуйте этим шагам для быстрого запуска.

---

## ⚡ БЫСТРЫЙ СТАРТ (15 минут)

### Шаг 1: Подготовьте credentials (5 мин)

Вам понадобятся:

1. **PostgreSQL Database**
   - Рекомендуем: [Supabase](https://supabase.com) (бесплатно)
   - Получите `DATABASE_URL`

2. **Telegram Bot**
   - Создайте бота через [@BotFather](https://t.me/BotFather)
   - Получите `TELEGRAM_BOT_TOKEN`

3. **Supabase Auth**
   - В проекте Supabase: Settings → API
   - Скопируйте `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

4. **Секреты** (сгенерируйте):
   ```bash
   openssl rand -hex 32  # для BOT_API_SECRET
   openssl rand -hex 32  # для SESSION_SECRET
   ```

---

### Шаг 2: Настройте окружение (2 мин)

```bash
# Скопируйте шаблон
cp .env.production.example .env.production

# Откройте и заполните
nano .env.production
```

**Минимально необходимые переменные:**
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
TELEGRAM_BOT_TOKEN=123456:ABC...
BOT_API_SECRET=your-generated-secret-32-chars
```

---

### Шаг 3: Запустите deployment (5 мин)

```bash
# Автоматический deployment
./scripts/deploy.sh production

# Скрипт выполнит:
# ✅ Проверку переменных окружения
# ✅ TypeScript компиляцию
# ✅ Тесты
# ✅ Сборку Docker образов
# ✅ Запуск контейнеров
# ✅ Health checks
```

---

### Шаг 4: Проверьте (3 мин)

```bash
# Проверка здоровья
curl http://localhost:5000/api/health

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f app

# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps
```

---

## 🎯 DEPLOYMENT OPTIONS

### 1️⃣ Docker Compose (Рекомендуется)
```bash
./scripts/deploy.sh production
```
**Время:** 15 мин | **Сложность:** Легко

### 2️⃣ Vercel (Cloud)
```bash
npm i -g vercel
vercel --prod
```
**Время:** 10 мин | **Сложность:** Очень легко

### 3️⃣ Railway (Cloud)
```bash
npm i -g @railway/cli
railway up
```
**Время:** 10 мин | **Сложность:** Очень легко

### 4️⃣ AWS EC2 (VPS)
```bash
# См. DEPLOYMENT_GUIDE.md
```
**Время:** 30 мин | **Сложность:** Средне

---

## 📚 ДОКУМЕНТАЦИЯ

### Основные файлы

1. **START_HERE.md** ← ВЫ ЗДЕСЬ
   - Быстрый старт

2. **DEPLOYMENT_GUIDE.md**
   - Полное руководство (5,000+ слов)
   - Все варианты deployment
   - Troubleshooting

3. **DEPLOYMENT_STATUS.md**
   - Текущий статус
   - Чеклисты
   - Метрики

4. **README.md**
   - Описание проекта
   - Архитектура
   - API документация

---

## ✅ ЧТО ПОДГОТОВЛЕНО

### Configuration ✅
- `Dockerfile` - Production Docker image
- `docker-compose.prod.yml` - Production setup
- `nginx.conf` - Reverse proxy + SSL
- `.env.production.example` - Environment template

### Scripts ✅
- `scripts/deploy.sh` - Automated deployment
- `scripts/backup-database.sh` - Database backup
- `scripts/restore-database.sh` - Database restore
- `scripts/setup-backup-cron.sh` - Backup automation

### Documentation ✅
- Complete deployment guide
- Troubleshooting section
- Security best practices
- Performance tuning

---

## 🔐 БЕЗОПАСНОСТЬ

### Генерируйте сильные секреты

```bash
# Используйте эту команду для каждого секрета
openssl rand -hex 32

# Минимум 32 символа для:
# - BOT_API_SECRET
# - SESSION_SECRET
# - TELEGRAM_WEBHOOK_SECRET
```

### После deployment

```bash
# Установите SSL (Let's Encrypt)
sudo certbot --nginx -d your-domain.com

# Настройте firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Настройте Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bot/webhook"
```

---

## 🆘 ПОМОЩЬ

### Логи

```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs -f

# Только приложение
docker-compose -f docker-compose.prod.yml logs -f app

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

### Troubleshooting

**Контейнер не запускается:**
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Часто причины:
# - Не настроены env variables
# - Недоступна база данных
# - Порт уже занят
```

**Health check fails:**
```bash
# Подождите 30-60 секунд
curl http://localhost:5000/api/health

# Проверьте DATABASE_URL
echo $DATABASE_URL
```

---

## 📞 ДОПОЛНИТЕЛЬНАЯ ПОМОЩЬ

### Документация
- 📖 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Полное руководство
- 📊 [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Статус и чеклисты
- 🎉 [DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md) - Summary

### Ресурсы
- 🐳 [Docker Docs](https://docs.docker.com)
- ☁️ [Supabase Docs](https://supabase.com/docs)
- 🤖 [Telegram Bot API](https://core.telegram.org/bots/api)
- 🔐 [Let's Encrypt](https://letsencrypt.org)

---

## ⏭️ СЛЕДУЮЩИЕ ШАГИ

После успешного deployment:

1. **Настройте SSL**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **Автоматические бэкапы**
   ```bash
   ./scripts/setup-backup-cron.sh production
   ```

3. **Monitoring**
   - Настройте Sentry для error tracking
   - Откройте `/api/metrics` для Prometheus

4. **Тестирование**
   - Зарегистрируйте пользователя
   - Добавьте сотрудника
   - Создайте смену
   - Проверьте Telegram бота

---

## 🎉 ГОТОВО!

```
╔════════════════════════════════════════════════════╗
║                                                    ║
║    🚀 ВСЁ ГОТОВО К DEPLOYMENT! 🚀                  ║
║                                                    ║
║    Осталось:                                       ║
║    1. Заполнить .env.production                    ║
║    2. Запустить ./scripts/deploy.sh production     ║
║    3. Profit! 🎊                                   ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

**Время до launch:** ~15 минут ⏱️  
**Сложность:** Легко 🟢  
**Успешность:** Высокая ✅

---

**Удачного deployment! 🚀**

