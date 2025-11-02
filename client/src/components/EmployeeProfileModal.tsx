import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Calendar as CalendarIcon, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkHistoryCalendar } from "./WorkHistoryCalendar";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string;
};

interface EmployeeStats {
  efficiency_index: number;
  total_shifts: number;
  completed_shifts: number;
  late_count: number;
  absence_count: number;
  avg_work_hours: number;
}

type Shift = {
  id: string;
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  status: string;
};

interface EmployeeProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeProfileModal({ open, onOpenChange, employee }: EmployeeProfileModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const { companyId } = useAuth();

  // Fetch employee statistics
  const { data: stats, isLoading: statsLoading } = useQuery<EmployeeStats>({
    queryKey: ["/api/employees", employee?.id, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employee?.id}/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!employee?.id && open,
  });

  // Fetch employee shifts for calendar
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/employees", employee?.id, "shifts"],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employee?.id}/shifts?limit=1000`);
      if (!response.ok) throw new Error("Failed to fetch shifts");
      return response.json();
    },
    enabled: !!employee?.id && showHistoryModal,
  });

  if (!employee) return null;

  const getEfficiencyStatus = (efficiency: number) => {
    if (efficiency >= 80) return { icon: "🟢", text: "Отлично", color: "text-green-600" };
    if (efficiency >= 60) return { icon: "🟡", text: "Средне", color: "text-yellow-600" };
    return { icon: "🔴", text: "Низкий уровень", color: "text-red-600" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <div className="bg-[rgba(52,199,89,0.08)] text-[#34c759] rounded-full px-[10px] py-1 inline-flex items-center text-xs font-medium leading-[1.2]">
            Активен
          </div>
        );
      case "inactive":
      case "terminated":
        return (
          <div className="bg-[rgba(255,0,0,0.08)] text-[#ff0006] rounded-full px-[10px] py-1 inline-flex items-center text-xs font-medium leading-[1.2]">
            {status === "terminated" ? "Уволен" : "Неактивен"}
          </div>
        );
      case "on_leave":
        return (
          <div className="bg-[rgba(255,204,0,0.08)] text-[#ffcc00] rounded-full px-[10px] py-1 inline-flex items-center text-xs font-medium leading-[1.2]">
            В отпуске
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-full px-[10px] py-1 inline-flex items-center text-xs font-medium text-[#565656] leading-[1.2] border border-[#eeeeee]">
            {status}
          </div>
        );
    }
  };

  const efficiencyIndex = stats?.efficiency_index ?? 0;
  const efficiencyStatus = getEfficiencyStatus(efficiencyIndex);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#1a1a1a] leading-[1.2]">
              🧑 Профиль сотрудника
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1. Основная информация */}
            <div className="bg-[#f8f8f8] rounded-[20px] p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-[50px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium text-base">
                    {employee.full_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                      {employee.full_name}
                    </h3>
                    <p className="text-sm text-[#e16546] leading-[1.2] mt-1">
                      {employee.position}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(employee.status)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-2 text-sm font-medium text-white hover:bg-[#d15536] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Редактировать профиль
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-[#eeeeee]">
                <div>
                  <p className="text-xs text-[#959595] mb-1 leading-[1.2]">Часовой пояс</p>
                  <p className="text-sm font-medium text-[#1a1a1a] leading-[1.2]">
                    {employee.tz || "Europe/Moscow"}
                  </p>
                </div>
                {employee.telegram_user_id && (
                  <div>
                    <p className="text-xs text-[#959595] mb-1 leading-[1.2]">Telegram ID</p>
                    <p className="text-sm font-mono text-[#1a1a1a] leading-[1.2]">
                      {employee.telegram_user_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Рейтинг сотрудника */}
            <div className="bg-[#f8f8f8] rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#1a1a1a]" />
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  Рейтинг и эффективность
                </h3>
              </div>
              {statsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-[12px]" />
                  <Skeleton className="h-16 w-full rounded-[12px]" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Индекс эффективности */}
                  <div className={`p-4 rounded-[12px] ${
                    efficiencyIndex >= 80
                      ? "bg-[rgba(52,199,89,0.08)]"
                      : efficiencyIndex >= 60
                      ? "bg-[rgba(255,204,0,0.08)]"
                      : "bg-[rgba(255,0,0,0.08)]"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-[#959595] mb-1 leading-[1.2]">
                          Индекс эффективности
                        </p>
                        <p className={`text-3xl font-bold leading-[1.2] ${
                          efficiencyIndex >= 80
                            ? "text-[#34c759]"
                            : efficiencyIndex >= 60
                            ? "text-[#ffcc00]"
                            : "text-[#ff0006]"
                        }`}>
                          {efficiencyIndex.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-semibold leading-[1.2] ${
                          efficiencyIndex >= 80
                            ? "text-[#34c759]"
                            : efficiencyIndex >= 60
                            ? "text-[#ffcc00]"
                            : "text-[#ff0006]"
                        }`}>
                          {efficiencyStatus.icon} {efficiencyStatus.text}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          efficiencyIndex >= 80
                            ? "bg-[#34c759]"
                            : efficiencyIndex >= 60
                            ? "bg-[#ffcc00]"
                            : "bg-[#ff0006]"
                        }`}
                        style={{ width: `${Math.min(efficiencyIndex, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Статистика */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-[12px]">
                      <div className="flex items-center gap-2 text-[#34c759] mb-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <p className="text-xs font-medium leading-[1.2]">Завершено</p>
                      </div>
                      <p className="text-2xl font-bold text-[#1a1a1a] leading-[1.2]">
                        {stats?.completed_shifts ?? 0}
                      </p>
                      <p className="text-xs text-[#959595] leading-[1.2] mt-1">
                        из {stats?.total_shifts ?? 0} смен
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-[12px]">
                      <div className="flex items-center gap-2 text-[#ffcc00] mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <p className="text-xs font-medium leading-[1.2]">Опоздания</p>
                      </div>
                      <p className="text-2xl font-bold text-[#1a1a1a] leading-[1.2]">
                        {stats?.late_count ?? 0}
                      </p>
                      <p className="text-xs text-[#959595] leading-[1.2] mt-1">раз</p>
                    </div>

                    <div className="p-3 bg-white rounded-[12px]">
                      <div className="flex items-center gap-2 text-[#ff0006] mb-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <p className="text-xs font-medium leading-[1.2]">Пропуски</p>
                      </div>
                      <p className="text-2xl font-bold text-[#1a1a1a] leading-[1.2]">
                        {stats?.absence_count ?? 0}
                      </p>
                      <p className="text-xs text-[#959595] leading-[1.2] mt-1">дней</p>
                    </div>
                  </div>

                  {/* Средняя продолжительность работы */}
                  {stats?.avg_work_hours && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-[12px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#959595]" />
                        <span className="text-sm font-medium text-[#1a1a1a] leading-[1.2]">
                          Среднее время работы
                        </span>
                      </div>
                      <span className="text-lg font-bold text-[#1a1a1a] leading-[1.2]">
                        {stats.avg_work_hours.toFixed(1)} ч
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. История */}
            <div className="bg-[#f8f8f8] rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-[#1a1a1a]" />
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  История работы
                </h3>
              </div>
              <p className="text-sm text-[#959595] mb-4 leading-[1.2]">
                Календарь с отмеченными рабочими днями, пропусками и опозданиями
              </p>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full bg-white px-[17px] py-3 rounded-[40px] flex items-center justify-center gap-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#eeeeee] transition-colors border border-[#eeeeee]"
              >
                <CalendarIcon className="w-4 h-4" />
                Открыть историю
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <EditEmployeeModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        employee={employee}
        onSuccess={() => {
          setShowEditModal(false);
        }}
      />

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
              <CalendarIcon className="w-5 h-5 text-[#1a1a1a]" />
              История работы - {employee.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Legend */}
            <div className="bg-[#f8f8f8] rounded-[20px] p-4">
              <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3 leading-[1.2]">
                Легенда календаря
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-[rgba(52,199,89,0.08)] border-2 border-[#34c759]"></div>
                  <span className="text-xs text-[#1a1a1a] leading-[1.2]">🟢 Работал</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-[rgba(255,204,0,0.08)] border-2 border-[#ffcc00]"></div>
                  <span className="text-xs text-[#1a1a1a] leading-[1.2]">🟡 Опоздание</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-[rgba(255,0,0,0.08)] border-2 border-[#ff0006]"></div>
                  <span className="text-xs text-[#1a1a1a] leading-[1.2]">🔴 Пропуск</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-white border-2 border-[#eeeeee]"></div>
                  <span className="text-xs text-[#1a1a1a] leading-[1.2]">⚪️ Выходной</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            {shiftsLoading ? (
              <div className="bg-[#f8f8f8] rounded-[20px] p-4">
                <Skeleton className="h-[400px] w-full rounded-[12px]" />
              </div>
            ) : (
              <WorkHistoryCalendar employeeId={employee.id} shifts={shifts} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

