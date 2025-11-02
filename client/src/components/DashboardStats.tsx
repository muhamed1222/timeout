import { Users, Clock, Flag, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  hasSecondaryIcon?: boolean;
}

function StatCard({ title, value, icon: Icon, hasSecondaryIcon }: StatCardProps) {
  return (
    <div 
      className="bg-[#f8f8f8] rounded-[20px] p-4 h-[180px] flex flex-col justify-between flex-1"
      data-testid={`stat-card-${title.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-start justify-between">
        <div className="bg-white rounded-[40px] size-[50px] flex items-center justify-center">
          <Icon className="w-6 h-6 text-[#E16546]" />
        </div>
        {hasSecondaryIcon && (
          <Link href="/exceptions" aria-label="Перейти к Нарушения">
            <div className="bg-[rgba(255,255,255,0.5)] rounded-[40px] size-[50px] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.7)] transition-colors">
              <ArrowUpRight className="w-6 h-6 text-[#989898]" />
            </div>
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-[6px]">
        <div className="font-semibold text-base text-black">{title}</div>
        <div className="bg-white rounded-[20px] px-[10px] py-1 inline-flex items-center justify-center w-fit">
          <div className="text-[#565656] text-sm">{value}</div>
        </div>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
  onViewExceptions?: () => void;
}

export default function DashboardStats({ 
  totalEmployees, 
  activeShifts, 
  completedShifts, 
  exceptions,
  onViewExceptions 
}: DashboardStatsProps) {
  const handleViewExceptions = () => {
    console.log('View exceptions clicked');
    onViewExceptions?.();
  };

  return (
    <div className="flex gap-4">
      <StatCard
        title="Всего сотрудников"
        value={totalEmployees}
        icon={Users}
        hasSecondaryIcon
      />
      <StatCard
        title="Активные смены"
        value={activeShifts}
        icon={Clock}
      />
      <StatCard
        title="Завершено сегодня" 
        value={completedShifts}
        icon={Flag}
      />
        <StatCard
          title="Нарушения"
          value={exceptions}
          icon={AlertTriangle}
        hasSecondaryIcon
        />
      {/* Live region for screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="dashboard-announcements"
      />
    </div>
  );
}