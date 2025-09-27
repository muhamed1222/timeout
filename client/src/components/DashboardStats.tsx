import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, AlertTriangle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<any>;
  color?: string;
}

function StatCard({ title, value, change, icon: Icon, color = "text-primary" }: StatCardProps) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(' ', '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && <p className="text-xs text-muted-foreground">{change}</p>}
      </CardContent>
    </Card>
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Всего сотрудников"
        value={totalEmployees}
        change="+2 за месяц"
        icon={Users}
      />
      <StatCard
        title="Активные смены"
        value={activeShifts}
        icon={UserCheck}
        color="text-shift-active"
      />
      <StatCard
        title="Завершено сегодня" 
        value={completedShifts}
        icon={UserX}
        color="text-shift-done"
      />
      <div onClick={handleViewExceptions} className="cursor-pointer">
        <StatCard
          title="Исключения"
          value={exceptions}
          change={exceptions > 0 ? "Требует внимания" : "Все в порядке"}
          icon={AlertTriangle}
          color={exceptions > 0 ? "text-shift-missed" : "text-shift-active"}
        />
      </div>
    </div>
  );
}