import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import DashboardStats from "@/components/DashboardStats";
import { ShiftsTable } from "@/components/ShiftsTable";
import { EfficiencyAnalytics } from "@/components/EfficiencyAnalytics";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ErrorState } from "@/components/ErrorBoundary";
import { useRetry } from "@/hooks/useRetry";
import { getContextErrorMessage } from "@/lib/errorMessages";
import { queryConfig } from "@/lib/queryClient";

interface CompanyStats {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
}

interface ActiveShift {
  id: string;
  employee_id: string;
  employee: {
    full_name: string;
    position: string | null;
  };
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  status: string;
}


export default function Dashboard() {
  const { companyId, loading: authLoading } = useAuth();

  // Fetch company stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<CompanyStats>({
    ...queryConfig.dashboard,
    queryKey: ['/api/companies', companyId, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000,
  });

  // Fetch active shifts
  const { data: activeShifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery<ActiveShift[]>({
    ...queryConfig.live,
    queryKey: ['/api/companies', companyId, 'shifts', 'active'],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/shifts/active`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      return res.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  // Fetch completed shifts for today
  const today = new Date().toISOString().split('T')[0];
  const { data: completedShiftsData = [], isLoading: completedLoading } = useQuery<ActiveShift[]>({
    ...queryConfig.dashboard,
    queryKey: ['/api/companies', companyId, 'shifts', 'completed', today],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/shifts/active`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      const allShifts = await res.json();
      return allShifts.filter((shift: ActiveShift) => 
        shift.status === 'completed' && 
        shift.planned_start_at.startsWith(today)
      );
    },
    enabled: !!companyId,
  });

  // Fetch ratings for analytics
  const todayDate = new Date();
  const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  const periodStart = startOfMonth.toISOString().split('T')[0];
  const periodEnd = endOfMonth.toISOString().split('T')[0];


  const getShiftStatus = (shift: ActiveShift): "active" | "break" | "completed" => {
    if (shift.status === 'completed') return 'completed';
    // Определяем статус "break" по наличию активного перерыва (можно расширить)
    if (shift.status === 'active') return 'active';
    return 'active';
  };

  // Transform active shifts for table
  const activeShiftsTableData = activeShifts.map(shift => ({
    id: shift.id,
    employeeName: shift.employee.full_name,
    position: shift.employee.position || 'Сотрудник',
    startedAt: shift.actual_start_at 
      ? new Date(shift.actual_start_at).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      : new Date(shift.planned_start_at).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    rating: '100%', // Можно получить из рейтингов
    status: getShiftStatus(shift) as "active" | "break" | "completed",
  }));

  // Transform completed shifts for table
  const completedShiftsTableData = completedShiftsData.map(shift => ({
    id: shift.id,
          employeeName: shift.employee.full_name,
    position: shift.employee.position || 'Сотрудник',
    startedAt: shift.actual_start_at 
      ? new Date(shift.actual_start_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
      : new Date(shift.planned_start_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
    rating: '66%', // Можно получить из рейтингов
    status: 'completed' as const,
  }));


  // Retry hooks for failed queries
  const statsRetry = useRetry(['/api/companies', companyId, 'stats']);
  const shiftsRetry = useRetry(['/api/companies', companyId, 'shifts', 'active']);

  // Loading state
  if (authLoading || statsLoading || shiftsLoading || completedLoading) {
    return <DashboardSkeleton />;
  }

  // Error states with retry
  if (statsError) {
    return (
      <ErrorState
        message={getContextErrorMessage('dashboard', 'stats')}
        onRetry={() => statsRetry.retry()}
      />
    );
  }

  if (shiftsError) {
    return (
      <ErrorState
        message={getContextErrorMessage('shifts', 'fetch')}
        onRetry={() => shiftsRetry.retry()}
      />
    );
  }

  // Not authenticated
  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Необходимо войти в систему</p>
      </div>
    );
  }

  // Error state
  if (statsError || shiftsError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-destructive">Ошибка загрузки данных</p>
        <Button onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full relative pt-5 pr-5 pb-5" data-testid="page-dashboard">
      <div className="flex flex-col gap-5">
      {/* Stats */}
      <DashboardStats 
        totalEmployees={stats?.totalEmployees || 0}
        activeShifts={stats?.activeShifts || 0}
        completedShifts={stats?.completedShifts || 0}
        exceptions={stats?.exceptions || 0}
      />

      {/* Main Content */}
        <div className="flex gap-4">
          {/* Left side - Tables */}
          <div className="flex flex-col gap-4 flex-1">
            <ShiftsTable 
              title="Активные смены"
              shifts={activeShiftsTableData}
            />
            <ShiftsTable 
              title="Завершенные смены"
              shifts={completedShiftsTableData}
                />
        </div>

          {/* Right side - Analytics */}
          <div className="w-[267px] shrink-0">
            <EfficiencyAnalytics 
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}