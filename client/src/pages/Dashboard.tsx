import { useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ui/button";
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

// Выносим функцию за пределы компонента для оптимизации
const getShiftStatus = (shift: ActiveShift): "active" | "break" | "completed" => {
  if (shift.status === "completed") {
    return "completed";
  }
  // Определяем статус "break" по наличию активного перерыва (можно расширить)
  if (shift.status === "active") {
    return "active";
  }
  return "active";
};

export default function Dashboard() {
  const { companyId, loading: authLoading } = useAuth();

  // Fetch company stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<CompanyStats>({
    ...queryConfig.dashboard,
    queryKey: ["/api/companies", companyId, "stats"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
      
      try {
        const res = await fetch(`/api/companies/${companyId}/stats`, {
          signal: controller.signal,
          credentials: "include",
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          // If we get a 503 with fallback data, use it
          if (res.status === 503) {
            const data = await res.json();
            if (data.fallback) {
              return data.fallback;
            }
          }
          throw new Error(`Failed to fetch stats: ${res.status}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timeout - database unavailable");
        }
        throw error;
      }
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000,
    retry: (failureCount, error) => {
      // Don't retry on timeout or 503 errors
      if (error instanceof Error && (
        error.message.includes("timeout") || 
        error.message.includes("unavailable")
      )) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch active shifts
  const { data: activeShifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery<ActiveShift[]>({
    ...queryConfig.live,
    queryKey: ["/api/companies", companyId, "shifts", "active"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
      
      try {
        const res = await fetch(`/api/companies/${companyId}/shifts/active`, {
          signal: controller.signal,
          credentials: "include",
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          if (res.status === 503) {
            // Return empty array on service unavailable
            return [];
          }
          throw new Error(`Failed to fetch shifts: ${res.status}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          // Return empty array on timeout instead of throwing
          return [];
        }
        throw error;
      }
    },
    enabled: !!companyId,
    refetchInterval: 30000,
    staleTime: 20000,
    retry: (failureCount, error) => {
      // Don't retry on timeout
      if (error instanceof Error && error.message.includes("timeout")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch completed shifts for today
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: completedShiftsData = [], isLoading: completedLoading, error: completedError } = useQuery<ActiveShift[]>({
    ...queryConfig.dashboard,
    queryKey: ["/api/companies", companyId, "shifts", "completed", today],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
      
      try {
        const res = await fetch(`/api/companies/${companyId}/shifts/active`, {
          signal: controller.signal,
          credentials: "include",
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          if (res.status === 503) {
            // Return empty array on service unavailable
            return [];
          }
          throw new Error(`Failed to fetch completed shifts: ${res.status}`);
        }
        const allShifts = await res.json();
        return allShifts.filter((shift: ActiveShift) => 
          shift.status === "completed" && 
          shift.planned_start_at.startsWith(today),
        );
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          // Return empty array on timeout instead of throwing
          return [];
        }
        throw error;
      }
    },
    enabled: !!companyId,
    retry: (failureCount, error) => {
      // Don't retry on timeout
      if (error instanceof Error && error.message.includes("timeout")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch ratings for analytics - мемоизируем период
  const { periodStart, periodEnd } = useMemo(() => {
    const todayDate = new Date();
    const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    return {
      periodStart: startOfMonth.toISOString().split("T")[0],
      periodEnd: endOfMonth.toISOString().split("T")[0],
    };
  }, []); // Пересчитывается только при монтировании

  // Мемоизируем трансформацию активных смен
  const activeShiftsTableData = useMemo(() => {
    return activeShifts.map(shift => ({
      id: shift.id,
      employeeName: shift.employee.full_name,
      position: shift.employee.position || "Сотрудник",
      startedAt: shift.actual_start_at 
        ? new Date(shift.actual_start_at).toLocaleTimeString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit",
          second: "2-digit",
        })
        : new Date(shift.planned_start_at).toLocaleTimeString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit", 
        }),
      rating: "100%", // Можно получить из рейтингов
      status: getShiftStatus(shift),
    }));
  }, [activeShifts]);

  // Мемоизируем трансформацию завершенных смен
  const completedShiftsTableData = useMemo(() => {
    return completedShiftsData.map(shift => ({
      id: shift.id,
      employeeName: shift.employee.full_name,
      position: shift.employee.position || "Сотрудник",
      startedAt: shift.actual_start_at 
        ? new Date(shift.actual_start_at).toLocaleTimeString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit", 
        })
        : new Date(shift.planned_start_at).toLocaleTimeString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit", 
        }),
      rating: "66%", // Можно получить из рейтингов
      status: "completed" as const,
    }));
  }, [completedShiftsData]);

  // Retry hooks for failed queries - мемоизируем колбэки
  const statsRetry = useRetry(["/api/companies", companyId, "stats"]);
  const shiftsRetry = useRetry(["/api/companies", companyId, "shifts", "active"]);
  const completedRetry = useRetry(["/api/companies", companyId, "shifts", "completed", today]);
  
  const handleStatsRetry = useCallback(() => {
    statsRetry.retry();
  }, [statsRetry]);
  
  const handleShiftsRetry = useCallback(() => {
    shiftsRetry.retry();
  }, [shiftsRetry]);

  const handleCompletedRetry = useCallback(() => {
    completedRetry.retry();
  }, [completedRetry]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  // Loading state
  if (authLoading || statsLoading || shiftsLoading || completedLoading) {
    return <DashboardSkeleton />;
  }

  // Error states with retry
  if (statsError) {
    const errorMsg = getContextErrorMessage("dashboard", "stats");
    return (
      <ErrorState
        message={errorMsg.message}
        onRetry={handleStatsRetry}
      />
    );
  }

  if (shiftsError) {
    const errorMsg = getContextErrorMessage("shifts", "fetch");
    return (
      <ErrorState
        message={errorMsg.message}
        onRetry={handleShiftsRetry}
      />
    );
  }

  if (completedError) {
    const errorMsg = getContextErrorMessage("shifts", "fetch");
    return (
      <ErrorState
        message={errorMsg.message}
        onRetry={handleCompletedRetry}
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
        <Button onClick={handleReload}>
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
