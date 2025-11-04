import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker, DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRetry } from "@/hooks/useRetry";
import { ErrorState } from "@/components/ErrorBoundary";
import { ReportsSkeleton } from "@/components/LoadingSkeletons";
import { getContextErrorMessage } from "@/lib/errorMessages";
import { format, isToday, isYesterday, startOfDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type DailyReport = {
  id: string;
  shift_id: string;
  planned_items: string[] | null;
  done_items: string[] | null;
  blockers: string | null;
  tasks_links: string[] | null;
  time_spent: any;
  attachments: any;
  submitted_at: string;
  shift: {
    id: string;
    employee_id: string;
    planned_start_at: string;
    planned_end_at: string;
    actual_start_at: string | null;
    actual_end_at: string | null;
    status: string;
    created_at: string;
  };
  employee: {
    id: string;
    company_id: string;
    full_name: string;
    position: string | null;
    telegram_user_id: string | null;
    status: string;
    tz: string | null;
    created_at: string;
  };
};

export default function Reports() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const { data: reports = [], isLoading, error } = useQuery<DailyReport[]>({
    queryKey: ["/api/companies", companyId, "daily-reports"],
    enabled: !!companyId,
  });

  const reportsRetry = useRetry(["/api/companies", companyId, "daily-reports"]);

  const handleExport = () => {
    if (!filteredReports.length) {
      toast({
        title: "Нет данных",
        description: "Нет отчетов для экспорта",
        variant: "destructive",
      });
      return;
    }

    const data = filteredReports.map(report => ({
      Дата: format(new Date(report.shift.planned_start_at), "dd.MM.yyyy", { locale: ru }),
      Сотрудник: report.employee.full_name,
      Должность: report.employee.position || "-",
      Отчет: report.done_items ? report.done_items.join("; ") : "-",
      Примечания: report.blockers || "-",
      Отправлен: format(new Date(report.submitted_at), "dd.MM.yyyy HH:mm", { locale: ru }),
    }));
    
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reports_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast({
      title: "Экспорт завершен",
      description: "Отчеты экспортированы в CSV файл",
    });
  };

  const filteredReports = reports.filter(report => {
    if (!selectedDateRange || (!selectedDateRange.from && !selectedDateRange.to)) {
      return true;
    }
    const reportDate = new Date(report.shift.planned_start_at);
    if (selectedDateRange.from && selectedDateRange.to) {
      return reportDate >= selectedDateRange.from && reportDate <= selectedDateRange.to;
    }
    if (selectedDateRange.from) {
      return reportDate >= selectedDateRange.from;
    }
    if (selectedDateRange.to) {
      return reportDate <= selectedDateRange.to;
    }
    return true;
  });

  const formatDateRange = (range: DateRange | undefined): string => {
    if (!range || (!range.from && !range.to)) {
      return "Выбрать дату";
    }
    if (range.from && range.to) {
      return `${format(range.from, "dd.MM.yyyy", { locale: ru })}-${format(range.to, "dd.MM.yyyy", { locale: ru })}`;
    }
    if (range.from) {
      return `${format(range.from, "dd.MM.yyyy", { locale: ru })}-...`;
    }
    if (range.to) {
      return `...-${format(range.to, "dd.MM.yyyy", { locale: ru })}`;
    }
    return "Выбрать дату";
  };

  // Группируем отчеты по датам
  const groupedReports = filteredReports.reduce((acc, report) => {
    const reportDate = startOfDay(new Date(report.shift.planned_start_at));
    const dateKey = format(reportDate, "yyyy-MM-dd");
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(report);
    return acc;
  }, {} as Record<string, DailyReport[]>);

  const getDateLabel = (dateStr: string): string => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return "Сегодня";
    }
    if (isYesterday(date)) {
      return "Вчера";
    }
    return format(date, "dd MMMM yyyy", { locale: ru });
  };

  const formatReportDate = (dateStr: string): string => {
    const date = parseISO(dateStr);
    const dayName = format(date, "EEEE", { locale: ru });
    return `Отчет за ${format(date, "dd.MM.yy")}. ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  // Loading state
  if (authLoading || isLoading) {
    return <ReportsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={getContextErrorMessage("dashboard", "fetch")}
        onRetry={() => reportsRetry.retry()}
      />
    );
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="page-reports">
      {/* Кнопки действий */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="bg-[rgba(225,101,70,0.1)] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-[#e16546] hover:bg-[rgba(225,101,70,0.15)] transition-colors"
          data-testid="button-export-reports"
        >
          <Download className="w-4 h-4" />
          Экспорт
        </button>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-white hover:bg-[#d15536] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {formatDateRange(selectedDateRange)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-5 bg-white rounded-[20px] shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0" align="start">
            <DayPicker
              mode="range"
              selected={selectedDateRange}
              onSelect={(range) => {
                setSelectedDateRange(range);
                if (range?.from && range?.to) {
                  setIsCalendarOpen(false);
                }
              }}
              locale={ru}
              className="rounded-md"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-sm font-medium text-black",
                nav: "space-x-1 flex items-center",
                nav_button: "h-[30px] w-[30px] bg-transparent p-0 opacity-70 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-black rounded-lg h-[28px] w-[50px] font-normal text-sm bg-[#f8f8f8] flex items-center justify-center",
                row: "flex w-full mt-1",
                cell: "h-[35px] w-[50px] text-center text-sm p-0 relative",
                day: "h-[35px] w-[50px] p-0 font-normal rounded-lg hover:bg-[rgba(225,101,70,0.12)] aria-selected:opacity-100",
                day_range_start: "bg-[#e16546] text-white hover:bg-[#e16546] hover:text-white",
                day_range_end: "bg-[#e16546] text-white hover:bg-[#e16546] hover:text-white",
                day_selected: "bg-[#e16546] text-white hover:bg-[#e16546] hover:text-white",
                day_range_middle: "bg-[rgba(225,101,70,0.12)] text-black hover:bg-[rgba(225,101,70,0.2)]",
                day_outside: "text-[#bbbbbb] aria-selected:text-white",
                day_disabled: "text-[#bbbbbb] opacity-50",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 rotate-180" {...props} />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" {...props} />,
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Группированные отчеты */}
      <div className="flex flex-col gap-[30px]">
        {Object.entries(groupedReports)
          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
          .map(([dateKey, dateReports]) => (
            <div key={dateKey} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black leading-[1.2]">
                {getDateLabel(dateKey)}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {dateReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-5"
                    data-testid={`report-card-${report.id}`}
                  >
                    {/* Информация о сотруднике */}
                    <div className="flex gap-2 items-center">
                      <div className="size-[50px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium">
                        {getInitials(report.employee.full_name)}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="text-base font-semibold text-black leading-[1.2]">
                          {report.employee.full_name}
                        </div>
                        <div className="text-sm text-[#e16546] leading-[1.2]">
                          {report.employee.position || "Сотрудник"}
                        </div>
                      </div>
                    </div>

                    {/* Текст отчета */}
                    <div className="flex flex-col text-sm text-black leading-[1.2]">
                      <p className="mb-[10px]">
                        {formatReportDate(report.shift.planned_start_at)}
                      </p>
                      {report.done_items && report.done_items.length > 0 && (
                        <>
                          {report.done_items.map((item, index) => (
                            <p key={index} className={index < (report.done_items?.length ?? 0) - 1 ? "mb-[10px]" : ""}>
                              {index + 1}. {item}
                            </p>
                          ))}
                        </>
                      )}
                      {report.blockers && (
                        <p className="mt-[10px]">
                          {report.done_items && report.done_items.length > 0 ? report.done_items.length + 1 : 1}. {report.blockers}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Отчеты не найдены</p>
        </div>
      )}
    </div>
  );
}
