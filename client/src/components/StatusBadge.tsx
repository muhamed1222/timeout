import { Badge } from "@/ui/badge";
import { Clock, CheckCircle, Coffee, XCircle, AlertTriangle } from "lucide-react";

export type ShiftStatus = "planned" | "active" | "break" | "done" | "missed" | "late";

interface IStatusBadgeProps {
  status: ShiftStatus;
  text?: string;
  showIcon?: boolean;
}

const statusConfig = {
  planned: {
    color: "bg-shift-planned text-white",
    icon: Clock,
    defaultText: "Запланировано",
  },
  active: {
    color: "bg-shift-active text-white",
    icon: CheckCircle,
    defaultText: "Активна",
  },
  break: {
    color: "bg-shift-break text-white",
    icon: Coffee,
    defaultText: "Перерыв",
  },
  done: {
    color: "bg-shift-done text-white",
    icon: CheckCircle,
    defaultText: "Завершено",
  },
  missed: {
    color: "bg-shift-missed text-white",
    icon: XCircle,
    defaultText: "Пропущено",
  },
  late: {
    color: "bg-shift-late text-white",
    icon: AlertTriangle,
    defaultText: "Опоздание",
  },
};

export default function StatusBadge({ status, text, showIcon = true }: IStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayText = text || config.defaultText;

  return (
    <Badge 
      className={`${config.color} gap-1 font-medium`} 
      data-testid={`badge-status-${status}`}
      role="status"
      aria-label={`Статус: ${displayText}`}
    >
      {showIcon && <Icon className="w-3 h-3" aria-hidden="true" />}
      <span>{displayText}</span>
    </Badge>
  );
}