# ДИАГРАММЫ ПОТОКОВ ДАННЫХ ФРОНТЕНДА

## 📊 Визуальное представление архитектуры и потоков данных

---

## 🏗 ОБЩАЯ АРХИТЕКТУРА

```
┌────────────────────────────────────────────────────────────────┐
│                         БРАУЗЕР                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    index.html                             │  │
│  │                        ↓                                  │  │
│  │                   main.tsx                                │  │
│  │                        ↓                                  │  │
│  │                     App.tsx                               │  │
│  │                        ↓                                  │  │
│  │         ┌──────────────┴──────────────┐                  │  │
│  │         │                              │                  │  │
│  │    Public Routes             Protected Routes            │  │
│  │    - /login                  - / (Dashboard)             │  │
│  │    - /register               - /exceptions               │  │
│  │    - /webapp                 - /rating                   │  │
│  │                              - /employees                │  │
│  │                              - /reports                  │  │
│  │                              - /schedules                │  │
│  │                              - /settings                 │  │
│  │                              - /company                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────┐  ┌──────────────────┐                 │
│  │  React Query       │  │  Supabase Auth   │                 │
│  │  (State Manager)   │  │  (Authentication)│                 │
│  └────────────────────┘  └──────────────────┘                 │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   API Routes    │
                    │   /api/*        │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Backend Server │
                    │   Express.js    │
                    └─────────────────┘
```

---

## 🔐 ПОТОК АУТЕНТИФИКАЦИИ

```
┌─────────────────────────────────────────────────────────────────┐
│                        РЕГИСТРАЦИЯ                               │
└─────────────────────────────────────────────────────────────────┘

User fills Register form
    ↓
[full_name, company_name, email, password]
    ↓
react-hook-form validation (zod)
    ↓
POST /api/auth/register ────────────────────┐
    ↓                                        │
Backend creates:                             │
  1. Supabase user                          │
  2. Company record                         │
  3. Sets user_metadata.company_id          │
    ↓                                        │
Success Response ←──────────────────────────┘
    ↓
Supabase signInWithPassword(email, password)
    ↓
Session created → redirect to "/"


┌─────────────────────────────────────────────────────────────────┐
│                           ВХОД                                   │
└─────────────────────────────────────────────────────────────────┘

User fills Login form
    ↓
[email, password]
    ↓
react-hook-form validation (zod)
    ↓
Supabase signInWithPassword(email, password)
    ↓
Session created with user_metadata.company_id
    ↓
redirect to "/"


┌─────────────────────────────────────────────────────────────────┐
│                     AUTH STATE MANAGEMENT                        │
└─────────────────────────────────────────────────────────────────┘

useAuth() hook (in every protected page)
    ↓
supabase.auth.getSession() ─────→ Initial session
    ↓
supabase.auth.onAuthStateChange() → Subscribe to changes
    ↓
    ├─ User logs in  → setAuthState({ user, companyId, loading: false })
    ├─ User logs out → setAuthState({ user: null, companyId: null, loading: false })
    └─ Session refresh → Update state
    ↓
App.tsx checks authState:
    ↓
    ├─ loading: true  → Show Loader
    ├─ user: null     → Redirect to /login
    └─ user: exists   → Render Protected Routes
```

---

## 📊 DASHBOARD - ГЛАВНАЯ СТРАНИЦА

```
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD DATA FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Dashboard.tsx (mount)
    ↓
useAuth() → { companyId, loading }
    ↓
    ├──────────────────────┬──────────────────────┐
    ↓                      ↓                      ↓
useQuery:            useQuery:           useState:
stats                active shifts       searchQuery
    ↓                      ↓                      ↓
GET /api/companies/  GET /api/companies/    Local filter
:companyId/stats     :companyId/shifts/     state
                     active
    ↓                      ↓                      ↓
{                    [{                     "john doe"
  totalEmployees,      id,
  activeShifts,        employee: {
  completedShifts,       full_name,
  exceptions             position
}                      },
                       shift_start,
                       shift_end,
                       status,
                       current_work_interval,
                       current_break_interval,
                       daily_report
                     }, ...]
    ↓                      ↓                      ↓
DashboardStats       Transform to         Filter by
component            ShiftCard props      searchQuery
    ↓                      ↓                      ↓
Render 4 stat        Map to               Display
cards                transformedShifts    filtered
                         ↓                 shifts
                     Generate
                     RecentActivity
                     from intervals
                         ↓
                     Render:
                     - ShiftCard[] (grid)
                     - RecentActivity (sidebar)


┌─────────────────────────────────────────────────────────────────┐
│                       USER INTERACTIONS                          │
└─────────────────────────────────────────────────────────────────┘

[Search Input] ────→ setSearchQuery() ────→ Filter transformedShifts

[Filter Button] ───→ handleFilter() ──────→ ❌ Toast only (not implemented)

[Export Button] ───→ handleExport() ──────→ Generate CSV:
                                              1. Map filtered data
                                              2. Create CSV string
                                              3. Create Blob
                                              4. Download file

[Add Employee] ────→ setShowAddEmployeeModal(true)
                         ↓
                   Open AddEmployeeModal
                         ↓
                   User fills form
                         ↓
                   POST /api/employee-invites
                         ↓
                   Show QR code + link


[ShiftCard Buttons]:
  - "Подробнее" ────→ ❌ console.log only (no implementation)
  - "Сообщение" ────→ ❌ console.log only (no implementation)
```

---

## ⚠️ EXCEPTIONS - ИСКЛЮЧЕНИЯ

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXCEPTIONS DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Exceptions.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
useQuery: /api/companies/:companyId/exceptions
    ↓
Response: [{
  id,
  employee: { full_name },
  exception_type: 'late_arrival',  ← Backend format
  description,
  detected_at,
  severity: 1 | 2 | 3
}, ...]
    ↓
mapExceptionType(): Backend → Frontend
    'late_arrival'     → 'late'
    'early_departure'  → 'short_day'
    'extended_break'   → 'long_break'
    'no_report'        → 'no_report'
    'no_show'          → 'no_show'
    ↓
transformedExceptions[]
    ↓
    ├─────────────┬─────────────┬─────────────┐
    ↓             ↓             ↓             ↓
Filter by:   Filter by:    Filter by:    Render
searchQuery  severity      type          ExceptionCard[]


┌─────────────────────────────────────────────────────────────────┐
│                       USER INTERACTIONS                          │
└─────────────────────────────────────────────────────────────────┘

[Search Input] ────────→ setSearchQuery() ────→ Local filter

[Severity Badge] ──────→ handleSeverityFilter() → Toggle filter

[Type Badge] ──────────→ handleTypeFilter() ───→ Toggle filter

[Clear Filters] ───────→ clearFilters() ───────→ Reset all filters


[ExceptionCard Buttons]:
  - "Решить" ──────────→ ❌ console.log only (no API endpoint)
  - "Связаться" ───────→ ❌ console.log only (no implementation)
```

---

## 🏆 RATING - РЕЙТИНГ СОТРУДНИКОВ

```
┌─────────────────────────────────────────────────────────────────┐
│                        RATING DATA FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Rating.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
    ├──────────────────────┬──────────────────────┬──────────────┐
    ↓                      ↓                      ↓              ↓
useQuery:            useQuery:             useQuery:       useState:
employees            ratings               rules           filters
    ↓                      ↓                      ↓              ↓
GET /api/            GET /api/             GET /api/       period,
companies/           companies/            companies/      sortBy,
:id/employees        :id/ratings?          :id/violation-  search
                     periodStart=...       rules
                     &periodEnd=...
    ↓                      ↓                      ↓              ↓
[{                   [{                    [{                "current"
  id,                  employee_id,          id,             "rating"
  full_name,           rating: 95.5          code,           "john"
  position             }, ...]               name,
}, ...]                                      penalty_percent,
                                             auto_detectable,
                                             is_active
                                           }, ...]
    ↓                      ↓
    └──────────────────────┴────────→ Merge data:
                                       employees.map(emp => ({
                                         ...emp,
                                         rating: ratingsMap.get(emp.id) || 100
                                       }))
                                           ↓
                                      employeesWithRating[]
                                           ↓
                                      Filter & Sort
                                           ↓
                                      Render Rating Cards with:
                                      - Progress bar
                                      - Rating badge
                                      - Add Violation button


┌─────────────────────────────────────────────────────────────────┐
│                    ADD VIOLATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User clicks "Добавить нарушение" on Rating Card
    ↓
setSelectedEmployee(employee)
setIsViolationModalOpen(true)
    ↓
Open Modal with:
  - Select: violation rules (from query)
  - Input: comment (optional)
    ↓
User selects rule + adds comment
    ↓
Submit → useMutation: POST /api/violations
    {
      employee_id: selectedEmployee.id,
      company_id,
      rule_id: selectedRuleId,
      source: 'manual',
      reason: violationComment
    }
    ↓
On Success:
  ├─ Show toast notification
  ├─ Close modal
  ├─ Clear form state
  └─ queryClient.invalidateQueries(['/api/companies', companyId, 'ratings'])
      ↓
      Automatic refetch ratings
      ↓
      Rating recalculated on backend
      ↓
      UI updates with new rating
```

---

## 👥 EMPLOYEES - СОТРУДНИКИ

```
┌─────────────────────────────────────────────────────────────────┐
│                      EMPLOYEES DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Employees.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
    ├──────────────────────────┬────────────────────────────┐
    ↓                          ↓                            ↓
useQuery:                 useQuery:                   useState:
employees                 invites                     filters
refetchInterval: 5s       refetchInterval: 5s         
    ↓                          ↓                            ↓
GET /api/companies/       GET /api/companies/         searchQuery,
:id/employees             :id/employee-invites        selectedStatus
    ↓                          ↓                            ↓
[{                        [{                          "john", "active"
  id,                       id,
  full_name,                code: "ABC123",
  position,                 full_name,
  telegram_user_id,         position,
  status: 'active',         used_at: null,
  tz                        created_at
}, ...]                   }, ...]
    ↓                          ↓                            ↓
Filter by status          Filter: !used_at            Filter by search
    ↓                          ↓                            ↓
Render:                   Render:                     Display filtered
Employee Cards            Active Invite Cards         results


┌─────────────────────────────────────────────────────────────────┐
│                    ADD EMPLOYEE FLOW                             │
└─────────────────────────────────────────────────────────────────┘

User clicks "Добавить сотрудника"
    ↓
setShowAddEmployeeModal(true)
    ↓
AddEmployeeModal opens
    ↓
User fills form:
  - full_name (required)
  - position (optional)
    ↓
Submit → useMutation: POST /api/employee-invites
    {
      company_id,
      full_name,
      position
    }
    ↓
Response: { id, code, full_name, position }
    ↓
Fetch invite link:
GET /api/employee-invites/:code/link
    ↓
Response: {
  code,
  deep_link: "https://t.me/bot?start=ABC123",
  qr_code_url: "data:image/png;base64,..."
}
    ↓
Display:
  ├─ QR Code (scannable)
  ├─ Invite code
  ├─ Deep link (copyable)
  └─ Instructions for employee
    ↓
On close:
  ├─ queryClient.invalidateQueries(['employee-invites'])
  └─ Employees list auto-updates (polling)


┌─────────────────────────────────────────────────────────────────┐
│                    DELETE INVITE FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User clicks "Delete" on Invite Card
    ↓
useMutation: ❌ DELETE /api/employee-invites/:id
    ↓
    [ISSUE: Wrong syntax!]
    Current: apiRequest(`/api/.../${id}`, { method: 'DELETE' })
    Correct: apiRequest('DELETE', `/api/.../${id}`)
    ↓
On Success:
  ├─ Show toast
  └─ refetchInvites()
```

---

## 📋 REPORTS - ОТЧЕТЫ

```
┌─────────────────────────────────────────────────────────────────┐
│                       REPORTS DATA FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Reports.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
useQuery: /api/companies/:companyId/daily-reports
    ↓
Response: [{
  id,
  shift_id,
  planned_items: ["Task 1", "Task 2"],
  done_items: ["Task 1 done", "Task 2 done"],
  blockers: "Issue with ...",
  tasks_links: ["https://..."],
  time_spent: {...},
  attachments: {...},
  submitted_at: "2025-10-26T10:00:00Z",
  shift: {
    id,
    employee_id,
    planned_start_at,
    planned_end_at,
    actual_start_at,
    actual_end_at,
    status
  },
  employee: {
    id,
    full_name,
    position
  }
}, ...]
    ↓
    ├─────────────────────┬─────────────────────┐
    ↓                     ↓                     ↓
Filter by:           Filter by:          Render:
searchQuery          selectedDate        Report Cards
(employee name       (date picker)       with employee
or report text)                          + shift + report
    ↓                     ↓                     ↓
Filtered reports displayed


┌─────────────────────────────────────────────────────────────────┐
│                       EXPORT TO CSV                              │
└─────────────────────────────────────────────────────────────────┘

User clicks "Экспорт"
    ↓
Check: filteredReports.length > 0
    ↓
Map data to CSV format:
  {
    Дата: format(date, 'dd.MM.yyyy'),
    Сотрудник: full_name,
    Должность: position,
    Отчет: done_items.join('; '),
    Примечания: blockers,
    Отправлен: format(submitted_at, 'dd.MM.yyyy HH:mm')
  }
    ↓
Create CSV string with headers + rows
    ↓
Add UTF-8 BOM: '\uFEFF' + csv
    ↓
Create Blob: new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    ↓
Download: reports_YYYY-MM-DD.csv
```

---

## 📅 SCHEDULES - ГРАФИКИ РАБОТЫ

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCHEDULES DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Schedules.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
    ├──────────────────────────┬────────────────────────────┐
    ↓                          ↓                            ↓
useQuery:                 useQuery:                   useState:
templates                 employees                   forms
    ↓                          ↓                            ↓
GET /api/companies/       GET /api/companies/         isTemplateOpen,
:id/schedule-templates    :id/employees               isAssignOpen,
                                                      selectedWorkdays
    ↓                          ↓                            ↓
[{                        [{                          [1,2,3,4,5]
  id,                       id,                       (Mon-Fri)
  company_id,               full_name,
  name: "5/2",              position
  rules: {                }, ...]
    shift_start: "09:00",
    shift_end: "18:00",
    workdays: [1,2,3,4,5]
  }
}, ...]
    ↓                          ↓
Filter by search          Used in assign modal
    ↓                          ↓
Render:                   Select employee for
Template Cards            schedule assignment


┌─────────────────────────────────────────────────────────────────┐
│                   CREATE TEMPLATE FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User clicks "Создать график"
    ↓
Open Dialog with form:
  - name: string
  - shift_start: time
  - shift_end: time
  - workdays: number[] (selected via badges)
    ↓
User fills form and selects workdays
    ↓
Submit → useMutation: POST /api/schedule-templates
    {
      company_id,
      name,
      rules: {
        shift_start,
        shift_end,
        workdays: selectedWorkdays  ← [ISSUE: Not synced with form]
      }
    }
    ↓
On Success:
  ├─ queryClient.invalidateQueries(['schedule-templates'])
  ├─ templateForm.reset()
  ├─ setIsTemplateOpen(false)
  └─ Show toast


┌─────────────────────────────────────────────────────────────────┐
│                    ASSIGN SCHEDULE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

User clicks "Назначить график"
    ↓
Open Dialog with form:
  - employee_id: select from employees
  - schedule_id: select from templates
  - valid_from: date (default: today)
  - valid_to: date (optional)
    ↓
Submit → useMutation: POST /api/employee-schedule
    {
      employee_id,
      schedule_id,
      valid_from,
      valid_to: valid_to || null
    }
    ↓
On Success:
  ├─ assignForm.reset()
  ├─ setIsAssignOpen(false)
  └─ Show toast
    ↓
    [ISSUE: No visual feedback of assigned schedules]
```

---

## ⚙️ COMPANY SETTINGS - НАСТРОЙКИ КОМПАНИИ

```
┌─────────────────────────────────────────────────────────────────┐
│                  COMPANY SETTINGS DATA FLOW                      │
└─────────────────────────────────────────────────────────────────┘

CompanySettings.tsx (mount)
    ↓
useAuth() → { companyId }
    ↓
    ├──────────────────────────┬────────────────────────────┐
    ↓                          ↓                            ↓
useQuery:                 useQuery:                   Render:
company info              violation rules             Tabs
    ↓                          ↓                            ↓
GET /api/companies/       GET /api/companies/         - General
:id                       :id/violation-rules         - Violations
                                                      - Info
    ↓                          ↓
{                         [{
  id,                       id,
  name: "ООО Техком",       company_id,
  tz: "Europe/Moscow",      code: "late",
  settings: {...}           name: "Опоздание",
}                           penalty_percent: 5,
                            auto_detectable: true,
                            is_active: true
                          }, ...]


┌─────────────────────────────────────────────────────────────────┐
│                   UPDATE COMPANY FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User edits form in "General" tab:
  - name: string
  - tz: select
    ↓
Submit → useMutation: PUT /api/companies/:companyId
    { name, tz }
    ↓
On Success:
  ├─ queryClient.invalidateQueries(['/api/companies', companyId])
  └─ Show toast


┌─────────────────────────────────────────────────────────────────┐
│              ADD/EDIT VIOLATION RULE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User clicks "Добавить правило" in "Violations" tab
    ↓
Open custom modal (not Dialog UI) with form:
  - code: string (unique check on client only)
  - name: string
  - penalty_percent: number (1-100)
  - auto_detectable: boolean
  - is_active: boolean
    ↓
Submit:
  ├─ Check code uniqueness (client-side)
  ├─ If editing: PUT /api/violation-rules/:id
  └─ If creating: POST /api/violation-rules
    {
      company_id,
      code,
      name,
      penalty_percent: String(penalty_percent),
      auto_detectable,
      is_active
    }
    ↓
On Success:
  ├─ queryClient.invalidateQueries(['violation-rules'])
  ├─ Close modal
  └─ Show toast


┌─────────────────────────────────────────────────────────────────┐
│                  TOGGLE RULE ACTIVE STATUS                       │
└─────────────────────────────────────────────────────────────────┘

User toggles Switch in rules table
    ↓
useMutation: PUT /api/violation-rules/:id
    { ...rule, is_active: newValue }
    ↓
On Success:
  ├─ queryClient.invalidateQueries(['violation-rules'])
  └─ UI updates immediately (optimistic update)


┌─────────────────────────────────────────────────────────────────┐
│                       LOGOUT FLOW                                │
└─────────────────────────────────────────────────────────────────┘

User clicks "Выйти"
    ↓
supabase.auth.signOut()
    ↓
queryClient.clear()
    ↓
setLocation('/login')
    ↓
Show toast notification
```

---

## 📱 WEBAPP - TELEGRAM MINI APP

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEBAPP INITIALIZATION                       │
└─────────────────────────────────────────────────────────────────┘

WebAppPage.tsx (mount)
    ↓
Initialize Telegram WebApp:
  window.Telegram?.WebApp || mockTelegramWebApp
    ↓
Get Telegram user ID:
  tg.initDataUnsafe?.user?.id || "123456789" (mock)
    ↓
setTelegramId(userId)
    ↓
Request Geolocation:
  navigator.geolocation.getCurrentPosition()
    ↓
setLocation("lat,lng" | "unknown" | "not_supported")
    ↓
useQuery: ❌ GET /api/webapp/employee/:telegramId
    ↓
    [ISSUE: This endpoint doesn't exist on backend!]
    ↓
Response (expected): {
  employee: { id, name, telegram_user_id },
  activeShift: {...},
  workIntervals: [...],
  breakIntervals: [...],
  status: 'off_work' | 'working' | 'on_break' | 'unknown'
}


┌─────────────────────────────────────────────────────────────────┐
│                     SHIFT MANAGEMENT FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Status: 'off_work'
    ↓
User clicks "Начать смену"
    ↓
useMutation: ❌ POST /api/webapp/shift/start
    headers: { 'X-Telegram-Init-Data': tg.initData }
    body: { telegramId }
    ↓
    [ISSUE: Endpoint doesn't exist!]
    Expected: Create shift and work interval
    ↓
On Success:
  ├─ queryClient.invalidateQueries(['employee', telegramId])
  └─ Status changes to 'working'


Status: 'working'
    ↓
User has two options:
    ├─ "Начать перерыв"
    │   ↓
    │   ❌ POST /api/webapp/break/start
    │   { telegramId }
    │   ↓
    │   Expected: End work interval, start break interval
    │   ↓
    │   Status → 'on_break'
    │
    └─ "Завершить смену"
        ↓
        ❌ POST /api/webapp/shift/end
        { telegramId }
        ↓
        Expected: End work interval, complete shift
        ↓
        Status → 'off_work'


Status: 'on_break'
    ↓
User clicks "Закончить перерыв"
    ↓
useMutation: ❌ POST /api/webapp/break/end
    { telegramId }
    ↓
    Expected: End break interval, start work interval
    ↓
Status → 'working'


┌─────────────────────────────────────────────────────────────────┐
│                         ISSUES                                   │
└─────────────────────────────────────────────────────────────────┘

❌ All 5 API endpoints don't exist on backend:
  - GET  /api/webapp/employee/:id
  - POST /api/webapp/shift/start
  - POST /api/webapp/shift/end
  - POST /api/webapp/break/start
  - POST /api/webapp/break/end

⚠️ Geolocation is requested but never sent to server

⚠️ Mock Telegram SDK in development mode
```

---

## 🔄 REACT QUERY CACHE STRATEGY

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY CACHE STRUCTURE                         │
└─────────────────────────────────────────────────────────────────┘

queryClient
    ├─ ['/api/companies', companyId, 'stats']
    │    ↓
    │    Cache invalidated when:
    │    - Shift is started
    │    - Shift is ended
    │
    ├─ ['/api/companies', companyId, 'shifts', 'active']
    │    ↓
    │    No automatic refetch
    │    Invalidated when: shift updates
    │
    ├─ ['/api/companies', companyId, 'employees']
    │    ↓
    │    refetchInterval: 5000ms (in Employees page)
    │    refetchOnWindowFocus: true (in Employees page)
    │
    ├─ ['/api/companies', companyId, 'employee-invites']
    │    ↓
    │    refetchInterval: 5000ms (in Employees page)
    │    refetchOnWindowFocus: true (in Employees page)
    │
    ├─ ['/api/companies', companyId, 'ratings', period]
    │    ↓
    │    Invalidated when: violation is added
    │
    ├─ ['/api/companies', companyId, 'violation-rules']
    │    ↓
    │    Invalidated when: rule is created/updated/deleted
    │
    └─ ['/api/companies', companyId, 'schedule-templates']
         ↓
         Invalidated when: template is created/deleted


┌─────────────────────────────────────────────────────────────────┐
│                  CACHE INVALIDATION STRATEGY                     │
└─────────────────────────────────────────────────────────────────┘

After mutation success:
    ↓
queryClient.invalidateQueries({ queryKey: [...] })
    ↓
Triggers automatic refetch of matching queries
    ↓
UI updates with fresh data


Manual cache.delete():
    ↓
Used in server/routes.ts for company stats cache
    ↓
Ensures fresh stats after shift changes
```

---

## 📊 SUMMARY OF FLOWS

### ✅ Полностью рабочие потоки:
1. Authentication (Login/Register)
2. Dashboard stats display
3. Rating with violations
4. Employees management with invites
5. Reports display with export
6. Schedules management
7. Company settings

### ⚠️ Частично рабочие потоки:
1. Dashboard (RecentActivity has data access issues)
2. Exceptions (buttons don't work)
3. Rating (period selection not implemented)
4. Schedules (no visual feedback for assignments)

### ❌ Нерабочие потоки:
1. WebApp (all endpoints missing)
2. Settings page (fully mock)
3. ExceptionCard actions (resolve/contact)
4. ShiftCard actions (view details/send message)

---

_Документ создан для визуализации архитектуры и потоков данных фронтенда._

