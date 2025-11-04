/**
 * Компонент таблицы смен
 * Отображает список смен в табличном формате с информацией о сотруднике и статусе
 */

import { memo } from "react";
import type { ShiftRow } from "@/types";
import { getShiftStatusConfig } from "@/lib/utils/statusBadge";
import { Badge } from "@/ui/badge";

export interface IShiftsTableProps {
  /** Заголовок таблицы */
  title: string;
  /** Массив смен для отображения */
  shifts: ShiftRow[];
}

export const ShiftsTable = memo(function ShiftsTable({ title, shifts }: IShiftsTableProps) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start w-full">
          <div className="flex-1 text-sm text-muted-foreground">ФИО</div>
          <div className="flex-1 text-sm text-muted-foreground">Должность</div>
          <div className="flex-1 text-sm text-muted-foreground">Начал</div>
          <div className="flex-1 text-sm text-muted-foreground">Рейтинг</div>
          <div className="flex-1 text-sm text-muted-foreground">Статус</div>
        </div>
        {/* Rows */}
        {shifts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет данных
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="flex items-start w-full">
              <div className="flex-1 flex items-center gap-2">
                <div className="text-base text-foreground">{shift.employeeName}</div>
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-muted-foreground">
                {shift.position}
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-muted-foreground">
                {shift.startedAt}
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-muted-foreground">
                {shift.rating}
              </div>
              <div className="flex-1 flex items-center">
                {(() => {
                  const config = getShiftStatusConfig(shift.status);
                  if (!config) return null;
                  return (
                    <Badge className={config.className}>
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

