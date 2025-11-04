import { useState, useMemo } from "react";
import { Calendar } from "@/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { Skeleton } from "@/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ui/button";

interface Shift {
  id: string;
  employee_id: string;
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
}

interface IException {
  id: string;
  employee_id: string;
  date: string;
  kind: string;
  severity: number;
  resolved_at: string | null;
}

interface IDayData {
  date: Date;
  shifts: Shift[];
  exceptions: IException[];
  hasWork: boolean;
  hasLate: boolean;
  hasAbsence: boolean;
  workHours: number;
}

interface IEmployeeCalendarViewProps {
  employeeId: string;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function EmployeeCalendarView({
  employeeId,
  currentMonth,
  onMonthChange,
}: IEmployeeCalendarViewProps) {
  const { companyId } = useAuth();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch shifts for the month
  const { data: shifts, isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", employeeId, monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        employee_id: employeeId,
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      });
      const response = await fetch(`/api/shifts?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }
      return response.json();
    },
    enabled: !!employeeId && !!companyId,
  });

  // Fetch exceptions for the month
  const { data: exceptions, isLoading: exceptionsLoading } = useQuery<IException[]>({
    queryKey: ["/api/exceptions", employeeId, monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async () => {
      // Fetch exceptions for employee (need to check if endpoint exists)
      // For now, we'll fetch company exceptions and filter
      const response = await fetch(`/api/companies/${companyId}/exceptions`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch exceptions");
      }
      const data = await response.json();
      // Filter by employee and date range
      return data.filter(
        (exc: any) =>
          exc.employee?.id === employeeId &&
          new Date(exc.date || exc.detected_at) >= monthStart &&
          new Date(exc.date || exc.detected_at) <= monthEnd,
      );
    },
    enabled: !!employeeId && !!companyId,
  });

  // Process days data
  const daysData = useMemo<IDayData[]>(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const shiftsList = shifts || [];
    const exceptionsList = exceptions || [];

    return days.map((date) => {
      const dayShifts = shiftsList.filter((shift) => {
        const shiftDate = new Date(shift.planned_start_at);
        return isSameDay(shiftDate, date);
      });

      const dayExceptions = exceptionsList.filter((exc) => {
        const excDate = new Date(exc.date || (exc as any).detected_at);
        return isSameDay(excDate, date);
      });

      // Calculate work hours
      const workHours = dayShifts.reduce((total, shift) => {
        if (shift.actual_start_at && shift.actual_end_at) {
          const start = new Date(shift.actual_start_at);
          const end = new Date(shift.actual_end_at);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
        return total;
      }, 0);

      // Check for late (actual_start_at > planned_start_at)
      const hasLate = dayShifts.some((shift) => {
        if (shift.actual_start_at && shift.planned_start_at) {
          return new Date(shift.actual_start_at) > new Date(shift.planned_start_at);
        }
        return false;
      });

      // Check for absence (no actual_start_at but planned)
      const hasAbsence = dayShifts.some(
        (shift) => shift.status === "planned" && !shift.actual_start_at && new Date(shift.planned_start_at) < new Date(),
      );

      return {
        date,
        shifts: dayShifts,
        exceptions: dayExceptions,
        hasWork: dayShifts.length > 0,
        hasLate,
        hasAbsence,
        workHours,
      };
    });
  }, [shifts, exceptions, monthStart, monthEnd]);

  // Calendar modifiers
  const modifiers = useMemo(() => {
    return {
      work: daysData.filter((d) => d.hasWork && !d.hasLate && !d.hasAbsence).map((d) => d.date),
      late: daysData.filter((d) => d.hasLate).map((d) => d.date),
      absence: daysData.filter((d) => d.hasAbsence).map((d) => d.date),
    };
  }, [daysData]);

  const modifiersClassNames = {
    work: "bg-[rgba(52,199,89,0.08)] border-2 border-[#34c759] rounded-full",
    late: "bg-[rgba(255,204,0,0.08)] border-2 border-[#ffcc00] rounded-full",
    absence: "bg-[rgba(255,0,0,0.08)] border-2 border-[#ff0006] rounded-full",
  };

  // Statistics
  const stats = useMemo(() => {
    const totalDays = daysData.length;
    const workDays = daysData.filter((d) => d.hasWork && !d.hasAbsence).length;
    const lateDays = daysData.filter((d) => d.hasLate).length;
    const absenceDays = daysData.filter((d) => d.hasAbsence).length;
    const totalHours = daysData.reduce((sum, d) => sum + d.workHours, 0);

    return {
      totalDays,
      workDays,
      lateDays,
      absenceDays,
      totalHours,
      avgHours: workDays > 0 ? totalHours / workDays : 0,
    };
  }, [daysData]);

  // Navigation
  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  const isLoading = shiftsLoading || exceptionsLoading;

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">
          {format(currentMonth, "LLLL yyyy", { locale: ru })}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-[12px] border border-[#eeeeee]">
          <p className="text-xs text-[#959595] mb-1">Рабочих дней</p>
          <p className="text-2xl font-bold text-[#1a1a1a]">{stats.workDays}</p>
        </div>
        <div className="p-3 bg-white rounded-[12px] border border-[#eeeeee]">
          <p className="text-xs text-[#959595] mb-1">Опозданий</p>
          <p className="text-2xl font-bold text-[#ffcc00]">{stats.lateDays}</p>
        </div>
        <div className="p-3 bg-white rounded-[12px] border border-[#eeeeee]">
          <p className="text-xs text-[#959595] mb-1">Пропусков</p>
          <p className="text-2xl font-bold text-[#ff0006]">{stats.absenceDays}</p>
        </div>
        <div className="p-3 bg-white rounded-[12px] border border-[#eeeeee]">
          <p className="text-xs text-[#959595] mb-1">Всего часов</p>
          <p className="text-2xl font-bold text-[#1a1a1a]">{stats.totalHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <Skeleton className="h-[350px] w-full rounded-[12px]" />
      ) : (
        <div className="bg-white rounded-[12px] border border-[#eeeeee] p-4">
          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={onMonthChange}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="rounded-md"
            locale={ru}
          />
        </div>
      )}

      {/* Legend */}
      <div className="bg-[#f8f8f8] rounded-[12px] p-4">
        <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Легенда</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[rgba(52,199,89,0.08)] border-2 border-[#34c759]"></div>
            <span className="text-xs text-[#1a1a1a]">Рабочий день</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[rgba(255,204,0,0.08)] border-2 border-[#ffcc00]"></div>
            <span className="text-xs text-[#1a1a1a]">Опоздание</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[rgba(255,0,0,0.08)] border-2 border-[#ff0006]"></div>
            <span className="text-xs text-[#1a1a1a]">Пропуск</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-white border-2 border-[#eeeeee]"></div>
            <span className="text-xs text-[#1a1a1a]">Выходной</span>
          </div>
        </div>
      </div>
    </div>
  );
}

