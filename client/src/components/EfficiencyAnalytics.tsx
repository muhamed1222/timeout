/**
 * Компонент аналитики эффективности сотрудников
 * Отображает топ сотрудников по эффективности за указанный период
 */

import { memo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import EmployeeAvatar from "./EmployeeAvatar";
import { useEfficiencyAnalytics } from "@/hooks/features/useEfficiencyAnalytics";
import { getChangeIconType, getChangeColor, formatEfficiency } from "@/lib/utils/efficiency";

export interface IEfficiencyAnalyticsProps {
  /** Начало периода для аналитики (ISO date string) */
  periodStart?: string;
  /** Конец периода для аналитики (ISO date string) */
  periodEnd?: string;
}

/**
 * Рендерит иконку изменения эффективности
 */
function ChangeIcon({ changeType }: { changeType: ReturnType<typeof getChangeIconType> }) {
  switch (changeType) {
    case "up":
      return <TrendingUp className="w-3 h-3 text-blue-500" />;
    case "down":
      return <TrendingDown className="w-3 h-3 text-destructive" />;
    case "none":
    default:
      return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
}

export const EfficiencyAnalytics = memo(function EfficiencyAnalytics({
  periodStart,
  periodEnd,
}: IEfficiencyAnalyticsProps) {
  const { employees, isLoading } = useEfficiencyAnalytics({
    periodStart,
    periodEnd,
    limit: 4,
  });

  return (
    <div className="bg-muted rounded-lg p-4 flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h3 className="font-semibold text-base text-foreground">Аналитика эффективности</h3>
        
        {/* Placeholder for chart - можно добавить реcharts позже */}
        <div className="relative size-[235px] mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Круговая диаграмма</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center justify-center gap-2 text-base w-full">
            <span className="font-semibold text-foreground flex-1">Сотрудник</span>
            <span className="text-muted-foreground/70">({employees.length})</span>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
          ) : (
            employees.map((employee, index) => {
              const changeType = getChangeIconType(employee.change);
              
              return (
                <div key={employee.id} className="flex flex-col gap-2 w-full">
                  {index > 0 && (
                    <div className="bg-border h-0.5 rounded-full w-full max-w-6 mx-auto" />
                  )}
                  <div className="flex items-center gap-2 w-full">
                    <EmployeeAvatar name={employee.name} size="md" />
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {employee.name}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Эффективность</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${getChangeColor(employee.change)}`}>
                            {formatEfficiency(employee.efficiency)}
                          </span>
                          <ChangeIcon changeType={changeType} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
