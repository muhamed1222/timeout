import { AlertTriangle, Clock, FileX, UserX, Coffee } from "lucide-react";
import { Button } from "@/ui/button";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";

export type ExceptionType = "late" | "no_report" | "short_day" | "long_break" | "no_show";

interface IExceptionCardProps {
  employeeName: string;
  employeeImage?: string;
  employee?: {
    photo_url?: string | null;
    avatar_id?: number | null;
    full_name: string;
  };
  type: ExceptionType;
  description: string;
  timestamp: string;
  severity: 1 | 2 | 3;
  onResolve?: () => void;
  onContact?: () => void;
}

const exceptionConfig = {
  late: {
    icon: Clock,
    color: "text-shift-late",
    bgColor: "bg-shift-late/10",
    title: "Опоздание",
  },
  no_report: {
    icon: FileX,
    color: "text-shift-missed",
    bgColor: "bg-shift-missed/10",
    title: "Нет отчета",
  },
  short_day: {
    icon: AlertTriangle,
    color: "text-shift-break",
    bgColor: "bg-shift-break/10",
    title: "Короткий день",
  },
  long_break: {
    icon: Coffee,
    color: "text-shift-break",
    bgColor: "bg-shift-break/10",
    title: "Долгий перерыв",
  },
  no_show: {
    icon: UserX,
    color: "text-shift-missed",
    bgColor: "bg-shift-missed/10",
    title: "Не явился",
  },
};

const severityColors = {
  1: "border-l-shift-break",
  2: "border-l-shift-late", 
  3: "border-l-shift-missed",
};

export default function ExceptionCard({ 
  employeeName, 
  employeeImage,
  employee,
  type, 
  description, 
  timestamp, 
  severity,
  onResolve,
  onContact, 
}: IExceptionCardProps) {
  const config = exceptionConfig[type];
  const Icon = config.icon;

  // Use employee data if provided, otherwise use employeeImage or initials
  const avatarUrl = employee 
    ? getEmployeeAvatarUrl(employee)
    : employeeImage || null;
  const initials = getEmployeeInitials(employeeName);

  const handleResolve = () => {
    console.log("Resolve exception for", employeeName);
    onResolve?.();
  };

  const handleContact = () => {
    console.log("Contact employee", employeeName);
    onContact?.();
  };

  return (
    <div 
      className="bg-muted rounded-lg p-4 flex flex-col gap-4" 
      data-testid={`card-exception-${type}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 flex-1">
          {/* Icon */}
          <div className={`${config.bgColor} rounded-full size-12 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={employeeName}
                  className="size-8 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.parentElement?.querySelector(".avatar-fallback") as HTMLElement;
                    if (fallback) {
                      fallback.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div className={`size-8 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground text-xs font-medium avatar-fallback ${avatarUrl ? "hidden" : ""}`}>
                {initials}
              </div>
              <span className="text-sm font-medium text-foreground">{employeeName}</span>
            </div>
            
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleResolve}
          variant="outline"
          size="sm"
          className="bg-green-500/10 text-green-600 hover:bg-green-500/15 border-green-500/20"
          data-testid="button-resolve-exception"
        >
          Решить
        </Button>
        <Button
          onClick={handleContact}
          variant="outline"
          size="sm"
          data-testid="button-contact-employee"
        >
          Связаться
        </Button>
      </div>
    </div>
  );
}