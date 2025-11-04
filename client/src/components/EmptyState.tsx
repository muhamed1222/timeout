/**
 * Empty State Component
 * 
 * Displays helpful empty states with actions
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  FileX, 
  Users, 
  Calendar, 
  AlertCircle, 
  Search,
  Inbox,
  type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
      role="status"
      aria-label="Empty state"
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="w-12 h-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Specific Empty States
 */

export function NoEmployeesEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="Нет сотрудников"
      description="Добавьте первого сотрудника, чтобы начать управление командой."
      action={{
        label: "Добавить сотрудника",
        onClick: onAdd,
      }}
    />
  );
}

export function NoShiftsEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="Нет смен"
      description="Создайте первую смену для начала отслеживания рабочего времени."
      action={{
        label: "Создать смену",
        onClick: onAdd,
      }}
    />
  );
}

export function NoResultsEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Ничего не найдено"
      description="Попробуйте изменить параметры поиска или фильтры."
      action={onClear ? {
        label: "Очистить фильтры",
        onClick: onClear,
      } : undefined}
    />
  );
}

export function NoExceptionsEmpty() {
  return (
    <EmptyState
      icon={FileX}
      title="Нет исключений"
      description="Все смены проходят без отклонений. Отличная работа!"
    />
  );
}

export function NoReportsEmpty() {
  return (
    <EmptyState
      icon={FileX}
      title="Нет отчетов"
      description="Отчеты появятся после завершения смен сотрудниками."
    />
  );
}

export function ErrorState({ 
  onRetry,
  message = "Произошла ошибка при загрузке данных", 
}: { 
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Ошибка загрузки"
      description={message}
      action={onRetry ? {
        label: "Повторить попытку",
        onClick: onRetry,
      } : undefined}
    />
  );
}
