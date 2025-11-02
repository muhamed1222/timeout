import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Shift = {
  id: string;
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  status: string;
};

type DayStatus = "worked" | "late" | "absence" | "dayoff" | null;

interface DayData {
  status: DayStatus;
  shift?: Shift;
  lateMinutes?: number;
}

interface WorkHistoryCalendarProps {
  employeeId: string;
  shifts: Shift[];
}

export function WorkHistoryCalendar({ employeeId, shifts }: WorkHistoryCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Process shifts to create a map of dates to day data
  const daysData = useMemo(() => {
    const map = new Map<string, DayData>();

    shifts.forEach((shift) => {
      const plannedStart = parseISO(shift.planned_start_at);
      const dateKey = format(plannedStart, "yyyy-MM-dd");
      const dayOfWeek = plannedStart.getDay(); // 0 = Sunday, 6 = Saturday

      // Check if it's a weekend (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (!map.has(dateKey)) {
          map.set(dateKey, { status: "dayoff" });
        }
        return;
      }

      let status: DayStatus = "worked";
      let lateMinutes = 0;

      // Check for absence (planned but never started)
      if (shift.status === "planned" && !shift.actual_start_at) {
        const plannedDate = new Date(shift.planned_start_at);
        if (plannedDate < new Date()) {
          status = "absence";
        }
      }
      // Check for late arrival (> 15 minutes)
      else if (shift.actual_start_at && shift.planned_start_at) {
        const actualStart = new Date(shift.actual_start_at);
        const plannedStart = new Date(shift.planned_start_at);
        const diffMinutes = (actualStart.getTime() - plannedStart.getTime()) / (1000 * 60);

        if (diffMinutes > 15) {
          status = "late";
          lateMinutes = Math.round(diffMinutes);
        } else {
          status = "worked";
        }
      }

      map.set(dateKey, {
        status,
        shift,
        lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      });
    });

    return map;
  }, [shifts]);

  const getDayData = (date: Date): DayData | undefined => {
    const dateKey = format(date, "yyyy-MM-dd");
    return daysData.get(dateKey);
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return "—";
    return format(parseISO(dateString), "HH:mm", { locale: ru });
  };

  const formatDate = (date: Date): string => {
    return format(date, "d MMMM yyyy", { locale: ru });
  };

  // Create modifiers for calendar days
  const modifiers = useMemo(() => {
    const worked: Date[] = [];
    const late: Date[] = [];
    const absence: Date[] = [];
    const dayoff: Date[] = [];

    daysData.forEach((dayData, dateKey) => {
      const date = parseISO(dateKey);
      switch (dayData.status) {
        case "worked":
          worked.push(date);
          break;
        case "late":
          late.push(date);
          break;
        case "absence":
          absence.push(date);
          break;
        case "dayoff":
          dayoff.push(date);
          break;
      }
    });

    return { worked, late, absence, dayoff };
  }, [daysData]);

  const modifiersClassNames = {
    worked: "bg-[rgba(52,199,89,0.08)] text-[#34c759] border-2 border-[#34c759] hover:bg-[rgba(52,199,89,0.15)] rounded-full",
    late: "bg-[rgba(255,204,0,0.08)] text-[#ffcc00] border-2 border-[#ffcc00] hover:bg-[rgba(255,204,0,0.15)] rounded-full",
    absence: "bg-[rgba(255,0,0,0.08)] text-[#ff0006] border-2 border-[#ff0006] hover:bg-[rgba(255,0,0,0.15)] rounded-full",
    dayoff: "bg-white text-[#959595] border-2 border-[#eeeeee] hover:bg-[#f8f8f8] rounded-full",
  };

  const hoveredDayData = hoveredDate ? getDayData(hoveredDate) : null;

  return (
    <div className="relative">
      <Calendar
        mode="single"
        month={selectedMonth}
        onMonthChange={setSelectedMonth}
        className="rounded-[20px] bg-[#f8f8f8] p-4"
        locale={ru}
        classNames={{
          months: "flex flex-col space-y-4",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-base font-semibold text-[#1a1a1a]",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-8 w-8 bg-white border border-[#eeeeee] rounded-[12px] flex items-center justify-center hover:bg-[#eeeeee] transition-colors text-[#1a1a1a] cursor-pointer"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-[#959595] rounded-md w-9 font-medium text-xs",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative group",
          day: "h-9 w-9 p-0 font-normal rounded-full relative text-[#1a1a1a] hover:bg-[#f8f8f8]",
        }}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        components={{
          IconLeft: ({ className, ...props }) => (
            <svg className={cn("h-4 w-4", className)} {...props} viewBox="0 0 15 15" fill="none">
              <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64038 12.0535 8.32397 12.0433 8.13511 11.8419L4.38511 7.84188C4.20408 7.64955 4.20408 7.35027 4.38511 7.15794L8.13511 3.15794C8.32397 2.9565 8.64038 2.94629 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          ),
          IconRight: ({ className, ...props }) => (
            <svg className={cn("h-4 w-4", className)} {...props} viewBox="0 0 15 15" fill="none">
              <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7961 7.3502 10.7961 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95696 11.6757 5.94675 11.3593 6.13562 11.1579L9.56503 7.49985L6.13562 3.84182C5.94675 3.64038 5.95696 3.32396 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          ),
          Day: ({ date, displayMonth, ...props }: any) => {
            const dayData = getDayData(date);
            return (
              <button
                {...props}
                type="button"
                onMouseEnter={(e) => {
                  if (dayData?.shift) {
                    setHoveredDate(date);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.bottom + 8,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredDate(null);
                  setTooltipPosition(null);
                }}
              >
                {date.getDate()}
              </button>
            );
          },
        }}
      />

      {/* Hover Tooltip */}
      {hoveredDate && hoveredDayData && hoveredDayData.shift && tooltipPosition && (
        <div
          className="fixed z-50 bg-white rounded-[12px] p-4 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.2)] border border-[#eeeeee] min-w-[280px] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="space-y-3">
            {/* Date */}
            <div className="flex items-center justify-between pb-2 border-b border-[#eeeeee]">
              <h4 className="text-sm font-semibold text-[#1a1a1a]">
                {formatDate(hoveredDate)}
              </h4>
              {hoveredDayData.status === "worked" && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-[#34c759]" />
                  <span className="text-xs text-[#34c759] font-medium">Работал</span>
                </div>
              )}
              {hoveredDayData.status === "late" && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-[#ffcc00]" />
                  <span className="text-xs text-[#ffcc00] font-medium">Опоздание</span>
                </div>
              )}
              {hoveredDayData.status === "absence" && (
                <div className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-[#ff0006]" />
                  <span className="text-xs text-[#ff0006] font-medium">Пропуск</span>
                </div>
              )}
            </div>

            {/* Shift Times */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#959595]" />
                  <span className="text-xs text-[#959595]">Планировалось</span>
                </div>
                <span className="text-xs font-medium text-[#1a1a1a]">
                  {formatTime(hoveredDayData.shift.planned_start_at)} — {formatTime(hoveredDayData.shift.planned_end_at)}
                </span>
              </div>

              {hoveredDayData.shift.actual_start_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#34c759]" />
                    <span className="text-xs text-[#959595]">Фактически</span>
                  </div>
                  <span className="text-xs font-medium text-[#1a1a1a]">
                    {formatTime(hoveredDayData.shift.actual_start_at)} — {formatTime(hoveredDayData.shift.actual_end_at)}
                  </span>
                </div>
              )}

              {hoveredDayData.lateMinutes && (
                <div className="flex items-center justify-between pt-2 border-t border-[#eeeeee]">
                  <span className="text-xs text-[#ffcc00] font-medium">Опоздание</span>
                  <span className="text-xs font-semibold text-[#ffcc00]">
                    {hoveredDayData.lateMinutes} мин
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

