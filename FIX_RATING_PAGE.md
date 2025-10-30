# 🔧 Исправление ошибки Rating Page

**Проблема:** "Не удалось загрузить данные рейтинга"

**Причина:** Backend server не запущен или не отвечает

---

## ⚡ БЫСТРОЕ РЕШЕНИЕ (1 минута)

### Шаг 1: Откройте новый терминал

```bash
cd /Users/outcasts/Documents/timeout
```

### Шаг 2: Запустите dev server

```bash
npm run dev
```

**Вы увидите:**
```
> rest-express@1.0.0 dev
> concurrently "npm run server" "npm run client"

[0] Server running on http://localhost:5000
[1] Vite dev server running on http://localhost:5173
```

### Шаг 3: Откройте браузер

Перейдите на: `http://localhost:5173/rating`

**Готово!** Ошибка должна исчезнуть! ✅

---

## 🔍 ЧТО ПРОИСХОДИТ?

### Frontend (React)
```typescript
// client/src/pages/Rating.tsx:109
const response = await apiRequest('GET', 
  `/api/companies/${companyId}/ratings?periodStart=${periodStart}&periodEnd=${periodEnd}`
);
```

Frontend делает запрос к backend API.

### Backend (Express)
```typescript
// server/routes/rating.ts:250
router.get("/companies/:companyId/ratings", async (req, res) => {
  const ratings = await storage.getEmployeeRatingsByCompany(companyId, startDate, endDate);
  res.json(ratings);
});
```

Backend должен вернуть данные из базы.

### Проблема
Если backend не запущен → Frontend не получает ответ → Показывается ошибка

---

## 📋 ДИАГНОСТИКА

### Проверка 1: Server запущен?

```bash
# В новом терминале:
curl http://localhost:5000/api/health
```

**Ожидается:**
```json
{"status":"ok","timestamp":"...","uptime":123}
```

**Если не работает:**
```bash
# Запустите server
cd /Users/outcasts/Documents/timeout
npm run dev
```

---

### Проверка 2: Database подключена?

```bash
cat .env | grep DATABASE_URL
```

**Должно быть:**
```
DATABASE_URL=postgresql://...
```

**Если отсутствует:**
1. Скопируйте `.env.example` → `.env`
2. Заполните `DATABASE_URL` от Supabase

---

### Проверка 3: Есть ли данные?

```bash
# В Supabase SQL Editor:
SELECT * FROM employee_ratings LIMIT 5;
```

**Если пусто:**
- Это нормально для нового проекта
- Рейтинги рассчитываются на основе нарушений
- Сначала создайте сотрудников и смены

---

## 🐛 ВОЗМОЖНЫЕ ОШИБКИ

### Ошибка 1: "Port 5000 already in use"

```bash
# Найдите процесс
lsof -i :5000

# Убейте его
kill -9 <PID>

# Или используйте другой порт
PORT=5001 npm run dev
```

---

### Ошибка 2: "Company not found"

**Причина:** Нет companyId

**Решение:**
1. Залогиньтесь в приложении
2. Создайте компанию в Settings
3. Обновите страницу Rating

---

### Ошибка 3: "Database connection failed"

**Причина:** Неверный DATABASE_URL

**Решение:**
```bash
# Проверьте .env
cat .env | grep DATABASE_URL

# Получите правильный URL из Supabase:
# Project Settings → Database → Connection string
```

---

### Ошибка 4: Пустой список рейтингов

**Причина:** Нет данных в БД

**Это нормально!** Рейтинги появятся после:
1. Создания сотрудников
2. Создания смен
3. Добавления нарушений (опционально)

**Как заполнить данные:**
```bash
# Запустите скрипт создания demo данных
npm run demo:create

# Или создайте вручную через UI:
# 1. Employees → Add Employee
# 2. Shifts → Create Shift
# 3. Rating → Add Violation (опционально)
```

---

## 🎯 ПРАВИЛЬНЫЙ WORKFLOW

### 1. Разработка (каждый раз)

```bash
# Терминал 1: Запустите dev server
cd /Users/outcasts/Documents/timeout
npm run dev

# Оставьте терминал открытым!
# Server будет работать, пока вы не остановите (Ctrl+C)
```

### 2. Открыть приложение

```
Браузер: http://localhost:5173
```

### 3. Использовать Rating Page

```
http://localhost:5173/rating
```

**Теперь всё работает!** ✅

---

## 🚀 PRODUCTION

В production всё работает автоматически:

```bash
# Build
npm run build

# Start production server
npm start

# Or with Docker
docker-compose -f docker-compose.prod.yml up -d
```

Health checks и автоматический перезапуск уже настроены!

---

## 📞 НУЖНА ПОМОЩЬ?

### Логи backend:
```bash
# В терминале, где запущен npm run dev
# Логи отображаются в реальном времени
```

### Логи frontend:
```bash
# В браузере: F12 → Console
# Или Network tab для API запросов
```

### Проверка API вручную:
```bash
# Health check
curl http://localhost:5000/api/health

# Rating periods
curl http://localhost:5000/api/rating/periods

# Company ratings (замените YOUR_COMPANY_ID)
curl "http://localhost:5000/api/companies/YOUR_COMPANY_ID/ratings?periodStart=2025-10-01&periodEnd=2025-10-31"
```

---

## ✅ CHECKLIST

- [ ] Server запущен (`npm run dev`)
- [ ] Backend отвечает (`curl http://localhost:5000/api/health`)
- [ ] Frontend открыт (`http://localhost:5173`)
- [ ] Залогинен в приложении
- [ ] CompanyId есть (создан в Settings)
- [ ] Database подключена (DATABASE_URL в .env)

**Если все галочки ✅ → Rating page должна работать!**

---

**Удачи! 🎉**

