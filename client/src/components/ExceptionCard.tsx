import { AlertTriangle, Clock, FileX, UserX, Coffee } from "lucide-react";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";

export type ExceptionType = 'late' | 'no_report' | 'short_day' | 'long_break' | 'no_show';

interface ExceptionCardProps {
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
    color: 'text-shift-late',
    bgColor: 'bg-shift-late/10',
    title: 'Опоздание'
  },
  no_report: {
    icon: FileX,
    color: 'text-shift-missed',
    bgColor: 'bg-shift-missed/10',
    title: 'Нет отчета'
  },
  short_day: {
    icon: AlertTriangle,
    color: 'text-shift-break',
    bgColor: 'bg-shift-break/10',
    title: 'Короткий день'
  },
  long_break: {
    icon: Coffee,
    color: 'text-shift-break',
    bgColor: 'bg-shift-break/10',
    title: 'Долгий перерыв'
  },
  no_show: {
    icon: UserX,
    color: 'text-shift-missed',
    bgColor: 'bg-shift-missed/10',
    title: 'Не явился'
  }
};

const severityColors = {
  1: 'border-l-shift-break',
  2: 'border-l-shift-late', 
  3: 'border-l-shift-missed'
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
  onContact 
}: ExceptionCardProps) {
  const config = exceptionConfig[type];
  const Icon = config.icon;

  // Use employee data if provided, otherwise use employeeImage or initials
  const avatarUrl = employee 
    ? getEmployeeAvatarUrl(employee)
    : employeeImage || null;
  const initials = getEmployeeInitials(employeeName);

  const handleResolve = () => {
    console.log('Resolve exception for', employeeName);
    onResolve?.();
  };

  const handleContact = () => {
    console.log('Contact employee', employeeName);
    onContact?.();
  };

  return (
    <div 
      className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4" 
      data-testid={`card-exception-${type}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 flex-1">
          {/* Icon */}
          <div className="bg-white rounded-[40px] size-[50px] flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-[#e16546]" />
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-black">{config.title}</h3>
              <span className="text-xs text-[#959595]">{timestamp}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={employeeName}
                  className="size-6 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`size-6 rounded-full bg-[#ff3b30] flex items-center justify-center text-white text-[10px] font-medium avatar-fallback ${avatarUrl ? 'hidden' : ''}`}>
                {initials}
              </div>
              <span className="text-sm font-medium text-black">{employeeName}</span>
            </div>
            
            <p className="text-sm text-[#565656]">{description}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
        <div className="flex gap-2">
        <button
          onClick={handleResolve}
          className="bg-[rgba(52,199,89,0.08)] px-[10px] py-2 rounded-[20px] text-xs font-medium text-[#34c759] leading-[1.2] hover:bg-[rgba(52,199,89,0.15)] transition-colors"
          data-testid="button-resolve-exception"
        >
            Решить
        </button>
        <button
          onClick={handleContact}
          className="bg-[#f8f8f8] px-[10px] py-2 rounded-[20px] text-xs font-medium text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors border border-[#eeeeee]"
          data-testid="button-contact-employee"
        >
            Связаться
        </button>
      </div>
        </div>
  );
}