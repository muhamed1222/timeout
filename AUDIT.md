# 🔍 АУДИТ СИСТЕМЫ SHIFTMANAGER

## 📊 СОСТОЯНИЕ СТРАНИЦ И ФУНКЦИЙ

### ✅ РАБОТАЮЩИЕ СТРАНИЦЫ

#### 1. **Telegram WebApp** (`/webapp`)
**Статус:** ✅ Полностью работает с реальным API

**Функциональность:**
- ✅ Получение данных сотрудника по telegram_user_id
- ✅ Начало смены (POST /api/webapp/shift/start)
- ✅ Завершение смены (POST /api/webapp/shift/end)
- ✅ Начало перерыва (POST /api/webapp/break/start)
- ✅ Завершение перерыва (POST /api/webapp/break/end)
- ✅ Криптографическая проверка Telegram WebApp подписи
- ✅ Отображение статуса сотрудника (working/on_break/off_work)

**Готово к использованию:** Да

---

### ⚠️ СТРАНИЦЫ С МОКАМИ

#### 2. **Дашборд** (`/`)
**Статус:** ⚠️ Работает на mock-данных

**Текущая функциональность:**
- ✅ Отображение статистики (моки)
- ✅ Карточки активных смен (моки)
- ✅ Поиск сотрудников (работает на моках)
- ✅ Недавняя активность (моки)
- ✅ Кнопка "Экспорт" (работает, экспортирует моки в CSV)
- ⚠️ Кнопка "Фильтр" (показывает уведомление о будущей версии)
- ⚠️ Кнопка "Добавить" (показывает уведомление о будущей версии)

**Что нужно сделать для работы с реальными данными:**

```typescript
// 1. Заменить mock stats на реальный API
const { data: stats } = useQuery({
  queryKey: ['/api/companies/:companyId/stats'],
});

// 2. Заменить mock shifts на реальный API
const { data: activeShifts } = useQuery({
  queryKey: ['/api/companies/:companyId/shifts/active'],
});

// 3. Получить company_id из Supabase Auth
const { data: { user } } = await supabase.auth.getUser();
const companyId = user?.user_metadata?.company_id;

// 4. Реализовать добавление сотрудника через форму
const handleAddEmployee = () => {
  // Открыть диалог с формой
  // POST /api/employees
};
```

**Необходимые API endpoints:** ✅ Уже есть
- GET `/api/companies/:companyId/shifts/active`
- GET `/api/companies/:companyId/employees`

**План работ:**
1. Создать хук `useAuth()` для получения company_id из Supabase
2. Подключить реальные API endpoints для статистики и смен
3. Создать Dialog/Modal для добавления сотрудников
4. Добавить фильтры по статусу смены

---

#### 3. **Исключения** (`/exceptions`)
**Статус:** ⚠️ Работает на mock-данных

**Текущая функциональность:**
- ✅ Отображение исключений (моки)
- ✅ Поиск исключений (работает на моках)
- ✅ Фильтры по важности (работает на моках)
- ✅ Фильтры по типу (работает на моках)
- ✅ Очистка фильтров

**Что нужно сделать для работы с реальными данными:**

```typescript
// 1. Получить реальные исключения
const { data: exceptions } = useQuery({
  queryKey: ['/api/companies/:companyId/exceptions'],
});

// 2. Добавить функцию разрешения исключения
const resolveException = useMutation({
  mutationFn: (id: string) => 
    apiRequest('PUT', `/api/exceptions/${id}/resolve`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/companies/:companyId/exceptions'] });
  }
});

// 3. Добавить кнопку "Разрешить" на каждую карточку
```

**Необходимые API endpoints:** ✅ Уже есть
- GET `/api/companies/:companyId/exceptions`
- PUT `/api/exceptions/:id/resolve`

**План работ:**
1. Подключить реальный API для получения исключений
2. Добавить кнопку "Разрешить" на ExceptionCard
3. Реализовать фильтрацию на стороне сервера (optional)

---

### 🚧 ЗАГЛУШКИ (В РАЗРАБОТКЕ)

#### 4. **Сотрудники** (`/employees`)
**Статус:** 🚧 Заглушка "Раздел в разработке"

**Что нужно реализовать:**

```typescript
// Список сотрудников с фильтрацией и поиском
const { data: employees } = useQuery({
  queryKey: ['/api/companies/:companyId/employees'],
});

// Функции:
// - Просмотр списка сотрудников
// - Добавление нового сотрудника (с формой)
// - Редактирование сотрудника
// - Создание invite-кода
// - Генерация QR-кода для приглашения
// - Просмотр истории смен сотрудника
// - Деактивация сотрудника
```

**Необходимые API endpoints:** ✅ Уже есть
- GET `/api/companies/:companyId/employees`
- POST `/api/employees`
- PUT `/api/employees/:id`
- POST `/api/employee-invites`
- GET `/api/employee-invites/:code/link`
- GET `/api/employees/:employeeId/shifts`

**UI компоненты для создания:**
- EmployeeList (таблица/карточки)
- EmployeeForm (диалог добавления/редактирования)
- InviteDialog (генерация и отображение QR-кода)
- EmployeeDetailsSheet (боковая панель с деталями)

---

#### 5. **Отчеты** (`/reports`)
**Статус:** 🚧 Заглушка "Раздел в разработке"

**Что нужно реализовать:**

```typescript
// Получение отчетов
const { data: reports } = useQuery({
  queryKey: ['/api/companies/:companyId/daily-reports'],
});

// Функции:
// - Просмотр ежедневных отчетов сотрудников
// - Фильтрация по дате, сотруднику
// - Экспорт отчетов в Excel/PDF
// - Аналитика (графики по выполненным задачам)
```

**Необходимые API endpoints:** ✅ Уже есть
- GET `/api/companies/:companyId/daily-reports`
- GET `/api/shifts/:shiftId/daily-report`

**UI компоненты для создания:**
- ReportsList (таблица отчетов)
- ReportDetails (детальный просмотр)
- ReportFilters (фильтры по датам)
- ReportCharts (графики и аналитика)

---

#### 6. **Графики** (`/schedules`)
**Статус:** 🚧 Заглушка "Раздел в разработке"

**Что нужно реализовать:**

```typescript
// API endpoints ОТСУТСТВУЮТ - нужно создать!

// Необходимые endpoints:
// GET /api/companies/:companyId/schedule-templates
// POST /api/schedule-templates
// PUT /api/schedule-templates/:id
// POST /api/employee-schedule (назначить график сотруднику)
// POST /api/companies/:companyId/generate-shifts (создать смены по графику)

// Функции:
// - Создание шаблонов графиков
// - Назначение графиков сотрудникам
// - Автоматическая генерация смен на основе графиков
// - Календарь с визуализацией графиков
```

**План работ:**
1. ⚠️ Создать API endpoints для schedule_template
2. ⚠️ Создать API endpoints для employee_schedule
3. ⚠️ Создать API для генерации смен из графиков
4. Создать UI для управления графиками
5. Интегрировать календарь (react-big-calendar или fullcalendar)

---

#### 7. **Настройки** (`/settings`)
**Статус:** 🚧 Заглушка "Раздел в разработке"

**Что нужно реализовать:**

```typescript
// Личные настройки пользователя
// - Смена пароля
// - Настройки уведомлений
// - Язык интерфейса
// - Часовой пояс
```

**План работ:**
1. Создать форму настроек пользователя
2. Интегрировать с Supabase Auth (смена пароля)
3. Добавить локальные настройки (язык, тема)

---

#### 8. **Настройки компании** (`/company`)
**Статус:** 🚧 Заглушка "Раздел в разработке"

**Что нужно реализовать:**

```typescript
// Настройки компании
const { data: company } = useQuery({
  queryKey: ['/api/companies/:companyId'],
});

// Функции:
// - Редактирование названия компании
// - Настройка часового пояса
// - Настройка параметров мониторинга (пороги опозданий, перерывов)
// - Настройка privacy settings
// - Загрузка логотипа компании
```

**Необходимые API endpoints:** ✅ Уже есть
- GET `/api/companies/:id`
- PUT `/api/companies/:id` (нужно добавить!)

**План работ:**
1. ⚠️ Добавить PUT endpoint для обновления компании
2. Создать форму настроек компании
3. Добавить загрузку изображений (логотип)

---

## 🔌 ГОТОВЫЕ API ENDPOINTS

### ✅ Companies
- POST `/api/companies` - Создание компании
- GET `/api/companies/:id` - Получение компании

### ✅ Employees
- POST `/api/employees` - Создание сотрудника
- GET `/api/employees/:id` - Получение сотрудника
- GET `/api/companies/:companyId/employees` - Список сотрудников
- PUT `/api/employees/:id` - Обновление сотрудника
- GET `/api/employees/telegram/:telegramUserId` - Поиск по Telegram ID

### ✅ Employee Invites
- POST `/api/employee-invites` - Создание приглашения
- GET `/api/employee-invites/:code` - Получение приглашения
- POST `/api/employee-invites/:code/use` - Использование приглашения
- GET `/api/employee-invites/:code/link` - Генерация deep link + QR code

### ✅ Shifts
- POST `/api/shifts` - Создание смены
- GET `/api/shifts/:id` - Получение смены
- GET `/api/employees/:employeeId/shifts` - Смены сотрудника
- GET `/api/companies/:companyId/shifts/active` - Активные смены компании
- PUT `/api/shifts/:id` - Обновление смены
- POST `/api/shifts/:id/start` - Начало смены (через бот)
- POST `/api/shifts/:id/end` - Завершение смены (через бот)
- POST `/api/shifts/:id/break/start` - Начало перерыва
- POST `/api/shifts/:id/break/end` - Завершение перерыва

### ✅ Work Intervals
- POST `/api/work-intervals` - Создание интервала
- GET `/api/shifts/:shiftId/work-intervals` - Интервалы смены
- PUT `/api/work-intervals/:id` - Обновление интервала

### ✅ Break Intervals
- POST `/api/break-intervals` - Создание перерыва
- GET `/api/shifts/:shiftId/break-intervals` - Перерывы смены

### ✅ Daily Reports
- POST `/api/daily-reports` - Создание отчета
- GET `/api/shifts/:shiftId/daily-report` - Отчет смены
- GET `/api/companies/:companyId/daily-reports` - Отчеты компании

### ✅ Exceptions
- POST `/api/exceptions` - Создание исключения
- GET `/api/companies/:companyId/exceptions` - Исключения компании
- PUT `/api/exceptions/:id/resolve` - Разрешение исключения

### ✅ Monitoring
- POST `/api/companies/:companyId/monitor` - Мониторинг компании
- POST `/api/monitor/global` - Глобальный мониторинг
- GET `/api/companies/:companyId/violations` - Нарушения компании

### ✅ Telegram
- POST `/api/telegram/webhook` - Webhook для Telegram бота
- GET `/api/webapp/employee/:telegramId` - Данные для WebApp
- POST `/api/webapp/shift/start` - Начало смены через WebApp
- POST `/api/webapp/shift/end` - Завершение смены через WebApp
- POST `/api/webapp/break/start` - Начало перерыва через WebApp
- POST `/api/webapp/break/end` - Завершение перерыва через WebApp

---

## ⚠️ ОТСУТСТВУЮЩИЕ API ENDPOINTS

### 🔴 Нужно создать:

1. **PUT** `/api/companies/:id` - Обновление компании
2. **GET** `/api/companies/:companyId/schedule-templates` - Список графиков
3. **POST** `/api/schedule-templates` - Создание графика
4. **PUT** `/api/schedule-templates/:id` - Обновление графика
5. **DELETE** `/api/schedule-templates/:id` - Удаление графика
6. **POST** `/api/employee-schedule` - Назначение графика сотруднику
7. **POST** `/api/companies/:companyId/generate-shifts` - Генерация смен из графика
8. **GET** `/api/companies/:companyId/stats` - Статистика для дашборда

---

## 🎯 ПРИОРИТЕЗИРОВАННЫЙ ПЛАН РАБОТ

### 🔥 Высокий приоритет (Основная функциональность)

1. **Дашборд - подключение к реальным данным**
   - [ ] Создать хук `useAuth()` для получения company_id
   - [ ] Создать GET `/api/companies/:companyId/stats`
   - [ ] Заменить моки на реальные данные
   - [ ] Добавить обработку загрузки и ошибок

2. **Исключения - подключение к реальным данным**
   - [ ] Подключить GET `/api/companies/:companyId/exceptions`
   - [ ] Добавить кнопку "Разрешить" на карточки
   - [ ] Подключить PUT `/api/exceptions/:id/resolve`

3. **Сотрудники - полная реализация**
   - [ ] Создать страницу со списком сотрудников
   - [ ] Форма добавления сотрудника
   - [ ] Генерация invite-кодов с QR
   - [ ] История смен сотрудника

### 📊 Средний приоритет (Расширенная функциональность)

4. **Отчеты - реализация**
   - [ ] Страница списка отчетов
   - [ ] Фильтры по дате и сотруднику
   - [ ] Детальный просмотр отчета
   - [ ] Экспорт в Excel

5. **Графики работы**
   - [ ] Создать API для schedule_template
   - [ ] Создать API для employee_schedule
   - [ ] UI для создания графиков
   - [ ] Генерация смен из графиков
   - [ ] Календарь с визуализацией

### 🔧 Низкий приоритет (Дополнительно)

6. **Настройки компании**
   - [ ] Создать PUT `/api/companies/:id`
   - [ ] Форма редактирования компании
   - [ ] Загрузка логотипа

7. **Настройки пользователя**
   - [ ] Форма настроек
   - [ ] Интеграция с Supabase Auth
   - [ ] Смена языка/темы

---

## 📝 ИТОГОВАЯ СТАТИСТИКА

- ✅ **Полностью работающие:** 1 страница (WebApp)
- ⚠️ **С моками:** 2 страницы (Dashboard, Exceptions)
- 🚧 **Заглушки:** 5 страниц (Employees, Reports, Schedules, Settings, Company)

**API endpoints:**
- ✅ Готово: 43 endpoints
- ⚠️ Нужно создать: 8 endpoints

**Общий прогресс:** ~35% функциональности готово к продакшену
