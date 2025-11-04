import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryConfig } from "@/lib/queryClient";
import EmployeeAvatar from "./EmployeeAvatar";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EmployeeEfficiency {
  id: string;
  name: string;
  efficiency: number;
  change?: number; // positive = up, negative = down, undefined = no change
}

interface EfficiencyAnalyticsProps {
  periodStart?: string;
  periodEnd?: string;
}

export function EfficiencyAnalytics({ periodStart, periodEnd }: EfficiencyAnalyticsProps) {
  const { companyId } = useAuth();
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const periodStartDate = periodStart || startOfMonth.toISOString().split("T")[0];
  const periodEndDate = periodEnd || endOfMonth.toISOString().split("T")[0];

  const { data: ratings = [], isLoading } = useQuery({
    ...queryConfig.dashboard,
    queryKey: ["/api/companies", companyId, "ratings", periodStartDate, periodEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/ratings?periodStart=${periodStartDate}&periodEnd=${periodEndDate}`);
      if (!res.ok) {
        throw new Error("Failed to fetch ratings");
      }
      return res.json();
    },
    enabled: !!companyId,
  });

  const employees: EmployeeEfficiency[] = ratings
    .slice(0, 4)
    .map((rating: any) => ({
      id: rating.employee_id || rating.id,
      name: rating.employee?.full_name || "Сотрудник",
      efficiency: Math.round(Number(rating.rating || 100)),
      change: undefined, // Можно добавить логику сравнения с предыдущим периодом
    }))
    .sort((a, b) => b.efficiency - a.efficiency);

  const getChangeIcon = (change?: number) => {
    if (change === undefined) {
      return <Minus className="w-2 h-2 text-[#606060]" />;
    }
    if (change > 0) {
      return <TrendingUp className="w-2 h-2 text-[#007aff]" />;
    }
    return <TrendingDown className="w-2 h-2 text-[#ff0006]" />;
  };

  const getChangeColor = (change?: number) => {
    if (change === undefined) {
      return "text-[#606060]";
    }
    if (change > 0) {
      return "text-[#3cd565]";
    }
    return "text-[#ff0006]";
  };

  return (
    <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-[30px]">
      <div className="flex flex-col gap-6">
        <h3 className="font-semibold text-base text-black">Аналитика эффективности</h3>
        
        {/* Placeholder for chart - можно добавить реcharts позже */}
        <div className="relative size-[235px] mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Круговая диаграмма</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center">
          <div className="flex items-center justify-center gap-2 text-base w-full">
            <span className="font-semibold text-black flex-1">Сотрудник</span>
            <span className="text-[rgba(0,0,0,0.3)]">({employees.length})</span>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
          ) : (
            employees.map((employee, index) => (
              <div key={employee.id} className="flex flex-col gap-1 w-full">
                {index > 0 && <div className="bg-[rgba(96,96,96,0.2)] h-[3px] rounded-[7px] w-full max-w-[25px] mx-auto" />}
                <div className="flex items-center gap-2 w-full">
                  <EmployeeAvatar name={employee.name} size={50} />
                  <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                    <div className="font-semibold text-sm text-black truncate">
                      {employee.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#606060]">Эффективность</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] ${getChangeColor(employee.change)}`}>
                          {employee.efficiency}%
                        </span>
                        {getChangeIcon(employee.change)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

