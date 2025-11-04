# Production Structure Guide

## Обзор структуры проекта

Проект реорганизован в production-ready структуру с четким разделением ответственности.

## Структура папок

```
client/src/
├── ui/                    # Базовые UI компоненты (переиспользуемые)
│   ├── button.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   └── ...
│
├── components/            # Бизнес-компоненты (feature-specific)
│   ├── DashboardStats.tsx
│   ├── ShiftsTable.tsx
│   ├── EfficiencyAnalytics.tsx
│   └── ...
│
├── pages/                 # Страницы приложения
│   ├── Dashboard.tsx
│   ├── Employees.tsx
│   └── ...
│
├── hooks/                 # React хуки
│   ├── features/         # Feature-specific хуки
│   │   ├── useDashboardData.ts
│   │   └── useEfficiencyAnalytics.ts
│   ├── useAuth.ts
│   └── ...
│
├── lib/                   # Утилиты и библиотеки
│   ├── utils/            # Утилиты
│   │   ├── transformShifts.ts
│   │   ├── efficiency.ts
│   │   └── statusBadge.ts
│   ├── queryClient.ts
│   └── ...
│
└── types/                 # TypeScript типы
    └── index.ts
```

## Принципы организации

### 1. UI компоненты (`ui/`)
- Базовые, переиспользуемые компоненты
- Не содержат бизнес-логики
- Полностью типизированы
- Примеры: `Button`, `Badge`, `Avatar`, `Dialog`

### 2. Бизнес-компоненты (`components/`)
- Компоненты, специфичные для фич
- Могут содержать минимальную логику отображения
- Используют хуки для бизнес-логики
- Примеры: `DashboardStats`, `ShiftsTable`, `EfficiencyAnalytics`

### 3. Страницы (`pages/`)
- Только композиция компонентов
- Используют хуки для данных
- Минимальная логика
- Пример: `Dashboard.tsx`

### 4. Хуки (`hooks/`)
- Feature-specific хуки: `hooks/features/`
- Общие хуки: `hooks/`
- Инкапсулируют логику загрузки данных
- Примеры: `useDashboardData`, `useEfficiencyAnalytics`

### 5. Утилиты (`lib/utils/`)
- Чистые функции
- Легко тестируемые
- Без побочных эффектов
- Примеры: `transformShifts`, `getShiftStatusBadge`

### 6. Типы (`types/`)
- Централизованные типы
- Переиспользуемые интерфейсы
- Экспорт типов из shared

## Примеры использования

### Страница с хуком

```typescript
// pages/Dashboard.tsx
import { useDashboardData } from "@/hooks/features/useDashboardData";
import { transformActiveShiftsToTableData } from "@/lib/utils/transformShifts";

export default function Dashboard() {
  const { stats, activeShifts, isLoading } = useDashboardData();
  const tableData = useMemo(
    () => transformActiveShiftsToTableData(activeShifts),
    [activeShifts]
  );
  
  // Только композиция компонентов
}
```

### Компонент с типизацией

```typescript
// components/ShiftsTable.tsx
import type { ShiftRow } from "@/types";
import { getShiftStatusBadge } from "@/lib/utils/statusBadge";

export interface ShiftsTableProps {
  title: string;
  shifts: ShiftRow[];
}

export function ShiftsTable({ title, shifts }: ShiftsTableProps) {
  // Компонент только отображает данные
}
```

## Миграция импортов

Все импорты UI компонентов должны использовать `@/ui/` вместо `@/components/ui/`:

```typescript
// ❌ Старый способ
import { Button } from "@/components/ui/button";

// ✅ Новый способ
import { Button } from "@/ui/button";
```

## Комментарии

Все сложные участки кода имеют комментарии:
- JSDoc комментарии для функций и компонентов
- Inline комментарии для сложной логики
- Описания параметров в интерфейсах

## Следующие шаги

1. Обновить все импорты `@/components/ui/` → `@/ui/`
2. Вынести оставшуюся бизнес-логику из компонентов в хуки
3. Добавить тесты для новых хуков и утилит
4. Документировать API хуков

