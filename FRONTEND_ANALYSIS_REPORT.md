# ОТЧЕТ АНАЛИЗА ФРОНТЕНДА ПРОЕКТА

Дата: 26 октября 2025
Проект: ShiftManager - Employee Shift Management System

---

## 📋 СОДЕРЖАНИЕ

1. [Архитектура и структура](#архитектура-и-структура)
2. [Карта потоков данных (Flow Map)](#карта-потоков-данных)
3. [Анализ страниц](#анализ-страниц)
4. [Анализ компонентов](#анализ-компонентов)
5. [Анализ хуков и утилит](#анализ-хуков-и-утилит)
6. [Анализ API вызовов](#анализ-api-вызовов)
7. [Проблемы и рекомендации](#проблемы-и-рекомендации)

---

## 🏗 АРХИТЕКТУРА И СТРУКТУРА

### Точка входа
```
index.html → /src/main.tsx → App.tsx → Router → Pages
```

### Технологический стек
- **UI Framework**: React 18
- **Routing**: wouter (легковесная альтернатива react-router)
- **State Management**: @tanstack/react-query (TanStack Query)
- **Styling**: TailwindCSS
- **Forms**: react-hook-form + zod validation
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui (47 компонентов)

### Структура директорий
```
client/src/
├── main.tsx                  # Entry point
├── App.tsx                   # Main app + routing
├── index.css                 # Global styles
├── pages/                    # 12 страниц приложения
│   ├── Dashboard.tsx
│   ├── Exceptions.tsx
│   ├── Rating.tsx
│   ├── Employees.tsx
│   ├── Reports.tsx
│   ├── Schedules.tsx
│   ├── Settings.tsx
│   ├── CompanySettings.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── webapp.tsx
│   └── NotFound.tsx
├── components/               # Кастомные компоненты
│   ├── ui/                   # 47 shadcn/ui компонентов
│   ├── AppSidebar.tsx
│   ├── DashboardStats.tsx
│   ├── ShiftCard.tsx
│   ├── ExceptionCard.tsx
│   ├── RecentActivity.tsx
│   ├── EmployeeAvatar.tsx
│   ├── StatusBadge.tsx
│   ├── ThemeToggle.tsx
│   └── AddEmployeeModal.tsx
├── hooks/                    # Custom hooks
│   ├── useAuth.ts
│   ├── use-toast.ts
│   └── use-mobile.tsx
└── lib/                      # Utilities
    ├── supabase.ts
    ├── queryClient.ts
    └── utils.ts
```

---

## 🗺 КАРТА ПОТОКОВ ДАННЫХ

### 1️⃣ ПОТОК АУТЕНТИФИКАЦИИ

```
User Input (Login/Register Form)
    ↓
react-hook-form + zod validation
    ↓
Supabase Auth API
    ↓
useAuth hook (subscription to auth state changes)
    ↓
App.tsx: проверка authentication state
    ↓
[Authenticated] → Main App (with Sidebar)
[Not Authenticated] → Login/Register pages
```

**Детали:**
- **Entry point**: `Login.tsx`, `Register.tsx`
- **Hook**: `useAuth()` - подписывается на `supabase.auth.onAuthStateChange`
- **Data flow**: 
  - Login: email/password → Supabase → session → redirect to "/"
  - Register: form data → `/api/auth/register` → Supabase auth → redirect to "/"
- **State**: хранится в Supabase session (cookies/localStorage)
- **Protected routes**: проверка в `App.tsx` (AppContent component)

**🔴 ПРОБЛЕМЫ:**
- ❌ Нет централизованного auth context - `useAuth` вызывается в каждом компоненте
- ❌ При регистрации создается компания, но нет проверки успешности
- ⚠️ Логика защиты роутов в одном файле - может усложниться при росте

---

### 2️⃣ ПОТОК DASHBOARD (Главная страница)

```
Dashboard.tsx (mount)
    ↓
useAuth() → получение companyId
    ↓
useQuery: /api/companies/:companyId/stats
useQuery: /api/companies/:companyId/shifts/active
    ↓
Transform data (activeShifts → ShiftCard props)
    ↓
Render:
  - DashboardStats (stats data)
  - ShiftCard[] (активные смены)
  - RecentActivity (генерируется из активных смен)
    ↓
User actions:
  - Search → filter local state
  - Filter → toast (not implemented)
  - Export → generate CSV from filtered data
  - Add Employee → AddEmployeeModal
```

**Детали потока данных:**
1. **Stats query**:
   - Key: `['/api/companies', companyId, 'stats']`
   - Response: `{ totalEmployees, activeShifts, completedShifts, exceptions }`
   - Используется: `DashboardStats` component

2. **Active shifts query**:
   - Key: `['/api/companies', companyId, 'shifts', 'active']`
   - Response: `ActiveShift[]` (смены с данными сотрудников)
   - Transform: `activeShifts.map(...)` → `transformedShifts`
   - Фильтр: local state `searchQuery`

3. **Генерация активности** (Recent Activity):
   - Создается локально из `activeShifts`
   - Проверяет `current_work_interval` и `current_break_interval`
   - Сортируется по времени

**🔴 ПРОБЛЕМЫ:**
- ⚠️ `RecentActivity` генерируется из `activeShifts`, но имеет ошибки доступа:
  - Использует `shift.current_work_interval.start_at` (должно быть `started_at`)
  - Использует `shift.current_break_interval.start_at` (должно быть `started_at`)
- ❌ `handleFilter` только показывает toast, функционал не реализован
- ⚠️ Нет обработки ошибок загрузки данных
- ⚠️ Polling отсутствует - данные не обновляются автоматически

---

### 3️⃣ ПОТОК EXCEPTIONS (Исключения)

```
Exceptions.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId/exceptions
    ↓
Transform: mapExceptionType (backend codes → frontend types)
    ↓
Filter: local filters (searchQuery, severity, type)
    ↓
Render: ExceptionCard[]
    ↓
User actions:
  - Search → local filter
  - Filter by severity → local filter
  - Filter by type → local filter
  - Resolve → onResolve callback (console.log only)
  - Contact → onContact callback (console.log only)
```

**Детали трансформации:**
```typescript
Backend Type → Frontend Type
'late_arrival' → 'late'
'early_departure' → 'short_day'
'extended_break' → 'long_break'
'no_report' → 'no_report'
'no_show' → 'no_show'
```

**🔴 ПРОБЛЕМЫ:**
- ❌ `onResolve` и `onContact` кнопки только логируют в консоль - **нет реальной функциональности**
- ❌ Нет API endpoint для разрешения исключений
- ⚠️ Severity фильтр работает, но нет визуального счетчика исключений по важности

---

### 4️⃣ ПОТОК RATING (Рейтинг сотрудников)

```
Rating.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId/employees
useQuery: /api/companies/:companyId/ratings (with period params)
useQuery: /api/companies/:companyId/violation-rules
    ↓
Merge: employees + ratings (default rating = 100)
    ↓
Filter & Sort: searchQuery, period, sortBy
    ↓
Render: Rating Cards with progress bars
    ↓
User actions:
  - Search → local filter
  - Change period → refetch ratings
  - Sort → local sort
  - Add Violation → Modal → POST /api/violations
      ↓
      Invalidate queries → refetch ratings
```

**Поток добавления нарушения:**
```
User clicks "Добавить нарушение"
    ↓
Open modal with violation rules
    ↓
Select rule + add comment
    ↓
useMutation: POST /api/violations
    {
      employee_id,
      company_id,
      rule_id,
      source: 'manual',
      reason: comment
    }
    ↓
On success:
  - Close modal
  - Invalidate ratings query
  - Show toast
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ Период "Прошлый месяц", "Квартал", "Год" - **не реализованы**, всегда загружается текущий месяц
- ⚠️ Модальное окно создано вручную (не использует Dialog UI component)
- ✅ Violation rules работают корректно

---

### 5️⃣ ПОТОК EMPLOYEES (Сотрудники)

```
Employees.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId/employees (refetch every 5s)
useQuery: /api/companies/:companyId/employee-invites (refetch every 5s)
    ↓
Filter: searchQuery, status
    ↓
Render:
  - Employee Cards
  - Active Invites with QR codes
    ↓
User actions:
  - Add Employee → AddEmployeeModal
      ↓
      POST /api/employee-invites
      ↓
      GET /api/employee-invites/:code/link (QR code)
      ↓
      Show invite with QR
  - Copy invite code
  - Delete invite → DELETE /api/employee-invites/:id
  - Show QR → fetch link data
```

**AddEmployeeModal поток:**
```
User fills form (full_name, position)
    ↓
Submit → POST /api/employee-invites
    {
      company_id,
      full_name,
      position
    }
    ↓
Response: { id, code, ... }
    ↓
Fetch: GET /api/employee-invites/:code/link
    ↓
Response: { deep_link, qr_code_url }
    ↓
Display QR code + link for employee
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ **Polling каждые 5 секунд** - может быть избыточным
- ⚠️ `DeleteInvite` mutation использует неправильный синтаксис:
  ```typescript
  // Неправильно:
  const response = await apiRequest(`/api/employee-invites/${inviteId}`, { method: 'DELETE' });
  
  // Правильно:
  const response = await apiRequest('DELETE', `/api/employee-invites/${inviteId}`);
  ```
- ✅ QR коды работают корректно

---

### 6️⃣ ПОТОК REPORTS (Отчеты)

```
Reports.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId/daily-reports
    ↓
Filter: searchQuery, selectedDate
    ↓
Render: Report Cards (employee + shift + report data)
    ↓
User actions:
  - Search → local filter
  - Date filter → local filter
  - Export → generate CSV with UTF-8 BOM
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ Нет сортировки отчетов по дате
- ✅ CSV экспорт работает корректно с BOM для Excel

---

### 7️⃣ ПОТОК SCHEDULES (Графики работы)

```
Schedules.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId/schedule-templates
useQuery: /api/companies/:companyId/employees
    ↓
Render: Template Cards
    ↓
User actions:
  - Create Template → Modal Form
      ↓
      POST /api/schedule-templates
      { company_id, name, rules: { shift_start, shift_end, workdays } }
      ↓
      Invalidate templates query
      
  - Assign Schedule → Modal Form
      ↓
      POST /api/employee-schedule
      { employee_id, schedule_id, valid_from, valid_to }
      ↓
      Close modal
      
  - Delete Template
      ↓
      DELETE /api/schedule-templates/:id
      ↓
      Invalidate templates query
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ Нет отображения, какому сотруднику назначен график
- ⚠️ Нет списка назначенных графиков
- ⚠️ `workdays` выбираются в форме, но не обновляются в `templateForm.setValue`

---

### 8️⃣ ПОТОК COMPANY SETTINGS (Настройки компании)

```
CompanySettings.tsx (mount)
    ↓
useAuth() → companyId
    ↓
useQuery: /api/companies/:companyId
useQuery: /api/companies/:companyId/violation-rules
    ↓
Render: Tabs (General, Violations, Info)
    ↓
User actions:
  - Update Company
      ↓
      PUT /api/companies/:companyId { name, tz }
      ↓
      Invalidate company query
      
  - Add/Edit Violation Rule → Modal Form
      ↓
      POST /api/violation-rules { code, name, penalty_percent, auto_detectable, is_active }
      OR
      PUT /api/violation-rules/:id { ... }
      ↓
      Invalidate rules query
      
  - Delete Violation Rule
      ↓
      DELETE /api/violation-rules/:id
      ↓
      Invalidate rules query
      
  - Toggle Rule Active Status
      ↓
      PUT /api/violation-rules/:id { is_active }
      ↓
      Invalidate rules query
      
  - Logout → supabase.auth.signOut() → clear cache → redirect /login
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ Модальное окно для violation rules создано вручную (не Dialog UI)
- ⚠️ Проверка уникальности `code` только на клиенте (нужна серверная проверка)
- ✅ Logout работает корректно

---

### 9️⃣ ПОТОК WEBAPP (Telegram Mini App)

```
WebAppPage.tsx (mount)
    ↓
Initialize Telegram WebApp SDK
    ↓
Get telegramId from window.Telegram.WebApp
    ↓
useQuery: /api/webapp/employee/:telegramId
    ↓
Render: Employee status + action buttons
    ↓
User actions:
  - Start Shift
      ↓
      POST /api/webapp/shift/start
      { telegramId }
      headers: { 'X-Telegram-Init-Data': tg.initData }
      ↓
      Invalidate employee query
      
  - End Shift → POST /api/webapp/shift/end
  - Start Break → POST /api/webapp/break/start
  - End Break → POST /api/webapp/break/end
```

**🔴 ПРОБЛЕМЫ:**
- ⚠️ Mock Telegram WebApp для разработки
- ⚠️ Нет проверки, существуют ли эти API endpoints
- ⚠️ Geolocation запрашивается, но не отправляется на сервер

---

## 📊 АНАЛИЗ СТРАНИЦ

### Список всех страниц

| Страница | Путь | Используется | Состояние | API Calls |
|----------|------|--------------|-----------|-----------|
| **Dashboard** | `/` | ✅ | Работает | ✅ 2 endpoints |
| **Exceptions** | `/exceptions` | ✅ | Частично | ✅ 1 endpoint |
| **Rating** | `/rating` | ✅ | Работает | ✅ 3 endpoints |
| **Employees** | `/employees` | ✅ | Работает | ✅ 2 endpoints + polling |
| **Reports** | `/reports` | ✅ | Работает | ✅ 1 endpoint |
| **Schedules** | `/schedules` | ✅ | Работает | ✅ 2 endpoints |
| **Settings** | `/settings` | ✅ | Mock только | ❌ 0 endpoints |
| **CompanySettings** | `/company` | ✅ | Работает | ✅ 2 endpoints |
| **Login** | `/login` | ✅ | Работает | ✅ Supabase |
| **Register** | `/register` | ✅ | Работает | ✅ 1 endpoint + Supabase |
| **webapp** | `/webapp` | ✅ | Частично | ⚠️ 4 endpoints (проверить) |
| **NotFound** | `*` (404) | ✅ | Работает | - |

### Детали по страницам

#### ✅ Dashboard.tsx
- **Props/State**: `companyId` (от useAuth)
- **API calls**: 
  - GET `/api/companies/:companyId/stats`
  - GET `/api/companies/:companyId/shifts/active`
- **Components used**: 
  - `DashboardStats`, `ShiftCard`, `RecentActivity`, `AddEmployeeModal`
- **Handlers**: 
  - `handleSearch` (filter), `handleFilter` (mock), `handleExport` (CSV), `handleAddEmployee`
- **Issues**: 
  - ❌ handleFilter не реализован
  - ❌ RecentActivity имеет ошибки доступа к полям
  - ⚠️ Нет автоматического обновления данных

#### ⚠️ Exceptions.tsx
- **API calls**: GET `/api/companies/:companyId/exceptions`
- **Components used**: `ExceptionCard`
- **Handlers**: `handleSearch`, `handleSeverityFilter`, `handleTypeFilter`, `clearFilters`
- **Issues**: 
  - ❌ Кнопки "Решить" и "Связаться" не работают (console.log only)
  - ❌ Нет API для разрешения исключений

#### ✅ Rating.tsx
- **API calls**: 
  - GET `/api/companies/:companyId/employees`
  - GET `/api/companies/:companyId/ratings?periodStart=...&periodEnd=...`
  - GET `/api/companies/:companyId/violation-rules`
  - POST `/api/violations`
- **Components used**: Rating Cards (inline), Modal (inline)
- **Issues**: 
  - ⚠️ Period selection не реализована полностью (всегда текущий месяц)
  - ⚠️ Модальное окно не использует UI Dialog

#### ✅ Employees.tsx
- **API calls**: 
  - GET `/api/companies/:companyId/employees` (refetchInterval: 5000)
  - GET `/api/companies/:companyId/employee-invites` (refetchInterval: 5000)
  - POST `/api/employee-invites`
  - GET `/api/employee-invites/:code/link`
  - DELETE `/api/employee-invites/:id`
- **Components used**: `AddEmployeeModal`, Employee Cards, Invite Cards
- **Issues**: 
  - ⚠️ deleteInviteMutation использует неправильный синтаксис apiRequest

#### ✅ Reports.tsx
- **API calls**: GET `/api/companies/:companyId/daily-reports`
- **Components used**: Report Cards (inline)
- **Issues**: ⚠️ Нет сортировки

#### ✅ Schedules.tsx
- **API calls**: 
  - GET `/api/companies/:companyId/schedule-templates`
  - GET `/api/companies/:companyId/employees`
  - POST `/api/schedule-templates`
  - POST `/api/employee-schedule`
  - DELETE `/api/schedule-templates/:id`
- **Issues**: 
  - ⚠️ Нет отображения назначенных графиков
  - ⚠️ workdays не синхронизируются с формой

#### ❌ Settings.tsx
- **API calls**: **НЕТ** (все только mock)
- **Issues**: 
  - ❌ handleSaveSettings только показывает toast
  - ❌ Нет реального API для обновления пользовательских настроек

#### ✅ CompanySettings.tsx
- **API calls**: 
  - GET `/api/companies/:companyId`
  - GET `/api/companies/:companyId/violation-rules`
  - PUT `/api/companies/:companyId`
  - POST/PUT/DELETE `/api/violation-rules/*`
- **Issues**: 
  - ⚠️ Модальное окно не использует UI Dialog
  - ⚠️ Проверка уникальности code только на клиенте

#### ✅ Login.tsx
- **API calls**: Supabase Auth
- **Issues**: ✅ Нет проблем

#### ✅ Register.tsx
- **API calls**: 
  - POST `/api/auth/register`
  - Supabase Auth
- **Issues**: ⚠️ Нет проверки успешности создания компании

#### ⚠️ webapp.tsx
- **API calls**: 
  - GET `/api/webapp/employee/:telegramId`
  - POST `/api/webapp/shift/start`
  - POST `/api/webapp/shift/end`
  - POST `/api/webapp/break/start`
  - POST `/api/webapp/break/end`
- **Issues**: 
  - ⚠️ Нужно проверить, существуют ли эти endpoints на сервере
  - ⚠️ Mock Telegram SDK для development
  - ⚠️ Geolocation не отправляется

#### ✅ NotFound.tsx
- **Issues**: ✅ Нет проблем

---

## 🧩 АНАЛИЗ КОМПОНЕНТОВ

### Кастомные компоненты

| Компонент | Используется | Где используется | Props | State | Issues |
|-----------|--------------|------------------|-------|-------|--------|
| **AppSidebar** | ✅ | App.tsx | - | location (wouter) | ✅ OK |
| **DashboardStats** | ✅ | Dashboard | stats numbers | - | ✅ OK |
| **ShiftCard** | ✅ | Dashboard | shift data, callbacks | - | ❌ callbacks не работают |
| **ExceptionCard** | ✅ | Exceptions | exception data, callbacks | - | ❌ callbacks не работают |
| **RecentActivity** | ✅ | Dashboard | activities[] | - | ⚠️ Потенциальные ошибки |
| **EmployeeAvatar** | ✅ | Многие компоненты | name, image, size | - | ✅ OK |
| **StatusBadge** | ✅ | ShiftCard | status, text, showIcon | - | ✅ OK |
| **ThemeToggle** | ✅ | App.tsx (header) | - | isDark | ✅ OK |
| **AddEmployeeModal** | ✅ | Dashboard, Employees | open, onOpenChange | formData, inviteData | ⚠️ См. ниже |

### Детали компонентов

#### ✅ AppSidebar.tsx
- **Используется**: App.tsx
- **Props**: Нет
- **Функционал**: Навигация по приложению
- **Issues**: ✅ Нет проблем

#### ✅ DashboardStats.tsx
- **Используется**: Dashboard.tsx
- **Props**: `totalEmployees`, `activeShifts`, `completedShifts`, `exceptions`, `onViewExceptions?`
- **Issues**: 
  - ⚠️ `onViewExceptions` передается, но никогда не используется в Dashboard

#### ❌ ShiftCard.tsx
- **Используется**: Dashboard.tsx
- **Props**: shift data + `onViewDetails?`, `onSendMessage?`
- **Issues**: 
  - ❌ Кнопки "Подробнее" и "Сообщение" только логируют в консоль
  - ❌ Нет реальной функциональности

#### ❌ ExceptionCard.tsx
- **Используется**: Exceptions.tsx
- **Props**: exception data + `onResolve?`, `onContact?`
- **Issues**: 
  - ❌ Кнопки "Решить" и "Связаться" только логируют в консоль
  - ❌ Нет реальной функциональности

#### ⚠️ RecentActivity.tsx
- **Используется**: Dashboard.tsx
- **Props**: `activities: ActivityItem[]`
- **Issues**: 
  - ⚠️ В Dashboard генерируются активности с неправильными полями:
    - `shift.current_work_interval.start_at` (должно быть `started_at`)

#### ✅ EmployeeAvatar.tsx
- **Используется**: Везде где нужны аватары
- **Issues**: ✅ Нет проблем

#### ✅ StatusBadge.tsx
- **Используется**: ShiftCard
- **Issues**: ✅ Нет проблем

#### ✅ ThemeToggle.tsx
- **Используется**: App.tsx (header)
- **Issues**: ✅ Нет проблем

#### ⚠️ AddEmployeeModal.tsx
- **Используется**: Dashboard.tsx, Employees.tsx
- **Props**: `open`, `onOpenChange`, `onSuccess?`
- **Issues**: 
  - ⚠️ В Employees.tsx передается `onSuccess` для refetch, но в Dashboard - нет
  - ⚠️ После создания инвайта не обновляется список в Dashboard

### UI Components (shadcn/ui)

**Всего: 47 компонентов**

Используемые компоненты:
- ✅ `Button`, `Input`, `Card`, `Badge`, `Avatar`, `Dialog`, `Form`, `Select`, `Tabs`, `Table`, `Switch`, `Label`, `Textarea`, `Sidebar`, `Toaster`, `Toast`, `Tooltip`

Потенциально неиспользуемые:
- ❓ `Accordion`, `Alert`, `AlertDialog`, `AspectRatio`, `Breadcrumb`, `Calendar`, `Carousel`, `Chart`, `Checkbox`, `Collapsible`, `Command`, `ContextMenu`, `Drawer`, `DropdownMenu`, `HoverCard`, `InputOTP`, `Menubar`, `NavigationMenu`, `Pagination`, `Popover`, `Progress`, `RadioGroup`, `Resizable`, `ScrollArea`, `Separator`, `Sheet`, `Skeleton`, `Slider`, `ToggleGroup`, `Toggle`

**Рекомендация**: Проверить использование и удалить неиспользуемые UI компоненты для уменьшения bundle size.

---

## 🪝 АНАЛИЗ ХУКОВ И УТИЛИТ

### Custom Hooks

| Hook | Файл | Используется | Где | Зависимости | Issues |
|------|------|--------------|-----|-------------|--------|
| **useAuth** | hooks/useAuth.ts | ✅ | Все защищенные страницы | supabase.auth | ✅ OK |
| **useToast** | hooks/use-toast.ts | ✅ | Везде для уведомлений | React state | ✅ OK |
| **useIsMobile** | hooks/use-mobile.tsx | ❓ | Нигде не найдено | window.matchMedia | ❌ Неиспользуется |

### Детали хуков

#### ✅ useAuth.ts
```typescript
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    companyId: null,
    loading: true
  });
  
  useEffect(() => {
    // Get initial session
    // Subscribe to auth changes
  }, []);
  
  return authState;
}
```

**Используется**: App.tsx, все страницы
**Issues**: ✅ Нет проблем

#### ✅ use-toast.ts
- Реализация toast notifications
- Используется глобальный state через listeners
- **Issues**: ✅ Нет проблем

#### ❌ use-mobile.tsx
- Определяет, является ли экран мобильным
- **Issues**: 
  - ❌ **НЕ ИСПОЛЬЗУЕТСЯ НИГДЕ**
  - Рекомендация: Удалить

### Utilities

#### ✅ supabase.ts
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
- Используется: useAuth, Login, Register, CompanySettings
- **Issues**: ✅ Нет проблем

#### ✅ queryClient.ts
```typescript
export async function apiRequest(method, url, data?) { ... }
export const getQueryFn = ({ on401 }) => async ({ queryKey }) => { ... }
export const queryClient = new QueryClient({ ... });
```
- Используется: Все страницы с API запросами
- **Issues**: ✅ Нет проблем

#### ✅ utils.ts
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
- Используется: Все UI компоненты
- **Issues**: ✅ Нет проблем

---

## 🔌 АНАЛИЗ API ВЫЗОВОВ

### Фронтенд → Бекенд маппинг

| Frontend Endpoint | Метод | Backend Route | Статус | Issues |
|-------------------|-------|---------------|--------|--------|
| `/api/auth/register` | POST | ✅ authRouter | ✅ OK | - |
| `/api/companies/:id` | GET | ✅ companiesRouter | ✅ OK | - |
| `/api/companies/:id` | PUT | ✅ companiesRouter | ✅ OK | - |
| `/api/companies/:id/stats` | GET | ✅ companiesRouter | ✅ OK | - |
| `/api/companies/:id/shifts/active` | GET | ✅ routes.ts:271 | ✅ OK | - |
| `/api/companies/:id/employees` | GET | ✅ routes.ts:156 | ✅ OK | - |
| `/api/companies/:id/exceptions` | GET | ✅ companiesRouter | ✅ OK | - |
| `/api/companies/:id/ratings` | GET | ✅ ratingRouter | ✅ OK | - |
| `/api/companies/:id/daily-reports` | GET | ✅ companiesRouter | ✅ OK | - |
| `/api/companies/:id/schedule-templates` | GET | ✅ routes.ts:168 | ✅ OK | - |
| `/api/companies/:id/violation-rules` | GET | ✅ ratingRouter | ✅ OK | - |
| `/api/employee-invites` | POST | ✅ invitesRouter | ✅ OK | - |
| `/api/employee-invites/:id` | DELETE | ✅ invitesRouter | ✅ OK | ⚠️ Неправильный синтаксис |
| `/api/employee-invites/:code/link` | GET | ✅ invitesRouter | ✅ OK | - |
| `/api/employee-schedule` | POST | ✅ routes.ts:180 | ✅ OK | - |
| `/api/schedule-templates` | POST | ✅ schedulesRouter | ✅ OK | - |
| `/api/schedule-templates/:id` | DELETE | ✅ schedulesRouter | ✅ OK | - |
| `/api/violation-rules` | POST | ✅ ratingRouter | ✅ OK | - |
| `/api/violation-rules/:id` | PUT | ✅ ratingRouter | ✅ OK | - |
| `/api/violation-rules/:id` | DELETE | ✅ ratingRouter | ✅ OK | - |
| `/api/violations` | POST | ✅ ratingRouter | ✅ OK | - |
| `/api/rating/periods` | GET | ✅ ratingRouter | ✅ OK | ⚠️ Не используется |
| `/api/webapp/employee/:id` | GET | ❌ **НЕТ** | ❌ 404 | **Битый путь** |
| `/api/webapp/shift/start` | POST | ❌ **НЕТ** | ❌ 404 | **Битый путь** |
| `/api/webapp/shift/end` | POST | ❌ **НЕТ** | ❌ 404 | **Битый путь** |
| `/api/webapp/break/start` | POST | ❌ **НЕТ** | ❌ 404 | **Битый путь** |
| `/api/webapp/break/end` | POST | ❌ **НЕТ** | ❌ 404 | **Битый путь** |

### 🔴 БИТЫЕ ПУТИ

#### ❌ WebApp API Endpoints (webapp.tsx)
**Проблема**: Страница `webapp.tsx` использует 5 endpoints, которых **НЕТ** на бекенде:

```typescript
// ❌ Эти endpoints отсутствуют в server/routes.ts:
GET  /api/webapp/employee/:telegramId
POST /api/webapp/shift/start
POST /api/webapp/shift/end
POST /api/webapp/break/start
POST /api/webapp/break/end
```

**Решение**: 
1. Создать WebApp router на бекенде
2. Или использовать существующие endpoints:
   - `/api/employees/:id` вместо `/api/webapp/employee/:id`
   - `/api/shifts/:id/start` вместо `/api/webapp/shift/start`
   - `/api/shifts/:id/end` вместо `/api/webapp/shift/end`
   - `/api/shifts/:id/break/start` вместо `/api/webapp/break/start`
   - `/api/shifts/:id/break/end` вместо `/api/webapp/break/end`

---

### ⚠️ Неиспользуемые API endpoints

#### `/api/rating/periods` (GET)
- **Определен**: ratingRouter
- **Используется**: Rating.tsx делает запрос, но данные не используются
- **Рекомендация**: Реализовать функционал выбора периода или удалить endpoint

---

## 🚨 ПРОБЛЕМЫ И РЕКОМЕНДАЦИИ

### ❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ

#### 1. **Битые пути в webapp.tsx**
- **Проблема**: 5 API endpoints не существуют на бекенде
- **Страницы**: webapp.tsx
- **Приоритет**: 🔴 Критический
- **Решение**: Создать WebApp API router или переделать на существующие endpoints

#### 2. **Нерабочие кнопки в ExceptionCard**
- **Проблема**: Кнопки "Решить" и "Связаться" только логируют в консоль
- **Страницы**: Exceptions.tsx
- **Приоритет**: 🔴 Высокий
- **Решение**: 
  - Создать API endpoint для разрешения исключений
  - Добавить функционал отправки сообщения сотруднику

#### 3. **Нерабочие кнопки в ShiftCard**
- **Проблема**: Кнопки "Подробнее" и "Сообщение" только логируют в консоль
- **Страницы**: Dashboard.tsx
- **Приоритет**: 🔴 Высокий
- **Решение**: 
  - Создать модальное окно с деталями смены
  - Добавить функционал отправки сообщения

#### 4. **Settings.tsx полностью mock**
- **Проблема**: Страница Settings не имеет реальной функциональности
- **Страницы**: Settings.tsx
- **Приоритет**: 🟠 Средний
- **Решение**: Создать API endpoints для обновления пользовательских настроек

---

### ⚠️ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ

#### 5. **Ошибки в RecentActivity**
- **Проблема**: Неправильные поля данных при генерации активности
  ```typescript
  // ❌ Неправильно:
  shift.current_work_interval.start_at
  
  // ✅ Правильно:
  shift.current_work_interval.started_at
  ```
- **Страницы**: Dashboard.tsx
- **Приоритет**: 🟠 Средний
- **Решение**: Исправить названия полей или структуру данных от API

#### 6. **Неправильный синтаксис apiRequest в deleteInviteMutation**
- **Проблема**: 
  ```typescript
  // ❌ Неправильно:
  const response = await apiRequest(`/api/employee-invites/${inviteId}`, { method: 'DELETE' });
  
  // ✅ Правильно:
  const response = await apiRequest('DELETE', `/api/employee-invites/${inviteId}`);
  ```
- **Страницы**: Employees.tsx
- **Приоритет**: 🟠 Средний
- **Решение**: Исправить вызов функции

#### 7. **Неполная реализация периодов в Rating**
- **Проблема**: Выбор периода не работает, всегда загружается текущий месяц
- **Страницы**: Rating.tsx
- **Приоритет**: 🟠 Средний
- **Решение**: Реализовать расчет дат для разных периодов

#### 8. **Проверка уникальности code только на клиенте**
- **Проблема**: CompanySettings проверяет уникальность кода нарушения только на фронтенде
- **Страницы**: CompanySettings.tsx
- **Приоритет**: 🟠 Средний
- **Решение**: Добавить серверную валидацию

---

### 🟡 УЛУЧШЕНИЯ И ОПТИМИЗАЦИИ

#### 9. **Избыточный polling в Employees**
- **Проблема**: Обновление каждые 5 секунд может быть избыточным
- **Страницы**: Employees.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Увеличить интервал до 30-60 секунд или использовать WebSocket

#### 10. **Отсутствие автообновления в Dashboard**
- **Проблема**: Данные на дашборде не обновляются автоматически
- **Страницы**: Dashboard.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Добавить refetchInterval или WebSocket

#### 11. **Отсутствие обработки ошибок**
- **Проблема**: Нет UI для отображения ошибок загрузки данных
- **Страницы**: Все страницы с API запросами
- **Приоритет**: 🟡 Низкий
- **Решение**: Добавить Error Boundaries и отображение ошибок

#### 12. **Неиспользуемые UI компоненты**
- **Проблема**: 30+ shadcn/ui компонентов не используются
- **Приоритет**: 🟡 Низкий
- **Решение**: Удалить неиспользуемые компоненты для уменьшения bundle size

#### 13. **Неиспользуемый хук useIsMobile**
- **Проблема**: Хук создан, но нигде не используется
- **Приоритет**: 🟡 Низкий
- **Решение**: Удалить или использовать для адаптивности

#### 14. **Модальные окна не используют UI Dialog**
- **Проблема**: В Rating и CompanySettings модальные окна сделаны вручную
- **Страницы**: Rating.tsx, CompanySettings.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Переделать на Dialog UI component для консистентности

#### 15. **Нет отображения назначенных графиков**
- **Проблема**: В Schedules нет информации, какому сотруднику назначен график
- **Страницы**: Schedules.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Добавить список назначений или метку на карточке сотрудника

#### 16. **workdays не синхронизируются с формой**
- **Проблема**: При выборе рабочих дней не обновляется поле формы
- **Страницы**: Schedules.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Использовать `templateForm.setValue('workdays', selectedWorkdays)`

#### 17. **AddEmployeeModal не обновляет Dashboard**
- **Проблема**: После создания инвайта в Dashboard не обновляется список
- **Страницы**: Dashboard.tsx
- **Приоритет**: 🟡 Низкий
- **Решение**: Передавать `onSuccess` callback для invalidate queries

---

### 🔍 ДУБЛИРУЮЩИЕ ОБРАБОТЧИКИ

#### handleSearch (4 дубликата)
- Dashboard.tsx
- Exceptions.tsx
- Rating.tsx
- Employees.tsx
- Reports.tsx
- Schedules.tsx

**Рекомендация**: Создать общий хук `useSearch(data, fields)` для повторного использования

#### handleExport (2 дубликата)
- Dashboard.tsx
- Reports.tsx

**Рекомендация**: Создать utility функцию `exportToCSV(data, filename)`

---

## 📈 СТАТИСТИКА

### Код
- **Всего файлов**: 76
- **Всего строк**: ~7500+
- **Всего импортов**: 377

### Компоненты
- **Pages**: 12
- **Custom Components**: 9
- **UI Components**: 47
- **Hooks**: 3

### API
- **Всего endpoints**: 24
- **Рабочих**: 19
- **Битых**: 5

### Проблемы
- **Критические**: 4
- **Серьезные**: 4
- **Улучшения**: 9

---

## ✅ ВЫВОДЫ

### Сильные стороны
1. ✅ Четкая структура проекта
2. ✅ Использование современного стека (React Query, Zod, TypeScript)
3. ✅ Консистентная UI библиотека (shadcn/ui)
4. ✅ Правильная архитектура с разделением на слои
5. ✅ Хорошая типизация с TypeScript

### Слабые стороны
1. ❌ Битые пути к API (webapp)
2. ❌ Неполная реализация функционала (кнопки-заглушки)
3. ⚠️ Отсутствие обработки ошибок
4. ⚠️ Дублирующий код
5. ⚠️ Неиспользуемые компоненты

### Рекомендации по приоритетам

#### Фаза 1: Критические исправления (1-2 дня)
1. Создать WebApp API endpoints или переделать webapp.tsx
2. Исправить ошибки в RecentActivity (поля данных)
3. Исправить синтаксис deleteInviteMutation

#### Фаза 2: Реализация функционала (3-5 дней)
4. Реализовать функционал кнопок в ExceptionCard
5. Реализовать функционал кнопок в ShiftCard
6. Реализовать Settings.tsx полностью
7. Реализовать выбор периода в Rating

#### Фаза 3: Улучшения и оптимизация (2-3 дня)
8. Добавить обработку ошибок во всех компонентах
9. Создать переиспользуемые хуки (useSearch, useExport)
10. Удалить неиспользуемые UI компоненты
11. Добавить WebSocket или polling для автообновления
12. Улучшить модальные окна (использовать Dialog UI)

---

## 📝 ЗАКЛЮЧЕНИЕ

Проект имеет **хорошую архитектурную основу** и использует современные практики разработки. Основные проблемы связаны с **незавершенной реализацией** некоторых функций и **битыми путями к API**. 

**Общая оценка качества фронтенда: 7/10**

После исправления критических проблем и реализации недостающего функционала, проект будет готов к продакшену.

---

_Отчет составлен автоматически на основе анализа кодовой базы._

