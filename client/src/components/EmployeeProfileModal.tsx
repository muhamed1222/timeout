import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Calendar, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import EmployeeAvatar from "./EmployeeAvatar";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (!employee) return null;

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600";
    if (efficiency >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyBg = (efficiency: number) => {
    if (efficiency >= 80) return "bg-green-100";
    if (efficiency >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getEfficiencyStatus = (efficiency: number) => {
    if (efficiency >= 80) return { icon: "🟢", text: "Отлично", color: "text-green-600" };
    if (efficiency >= 60) return { icon: "🟡", text: "Средне", color: "text-yellow-600" };
    return { icon: "🔴", text: "Низкий уровень", color: "text-red-600" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Активен</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Неактивен</Badge>;
      case "on_leave":
        return <Badge className="bg-blue-100 text-blue-800">В отпуске</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const efficiencyIndex = stats?.efficiency_index ?? 0;
  const efficiencyStatus = getEfficiencyStatus(efficiencyIndex);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">🧑 Профиль сотрудника</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 1. Основная информация */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <EmployeeAvatar 
                      name={employee.full_name} 
                      image={undefined}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">{employee.full_name}</h3>
                      <p className="text-muted-foreground">{employee.position}</p>
                      <div className="mt-2">
                        {getStatusBadge(employee.status)}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowEditModal(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать профиль
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Часовой пояс</p>
                    <p className="font-medium">{employee.tz || "Europe/Moscow"}</p>
                  </div>
                  {employee.telegram_user_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telegram ID</p>
                      <p className="font-mono text-sm">{employee.telegram_user_id}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Рейтинг сотрудника */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Рейтинг и эффективность
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Индекс эффективности */}
                    <div className={`p-4 rounded-lg ${getEfficiencyBg(efficiencyIndex)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Индекс эффективности
                          </p>
                          <p className={`text-3xl font-bold ${getEfficiencyColor(efficiencyIndex)}`}>
                            {efficiencyIndex.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-semibold ${efficiencyStatus.color}`}>
                            {efficiencyStatus.icon} {efficiencyStatus.text}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            efficiencyIndex >= 80
                              ? "bg-green-600"
                              : efficiencyIndex >= 60
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${Math.min(efficiencyIndex, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <CheckCircle className="w-4 h-4" />
                          <p className="text-xs font-medium">Завершено</p>
                        </div>
                        <p className="text-2xl font-bold">{stats?.completed_shifts ?? 0}</p>
                        <p className="text-xs text-muted-foreground">
                          из {stats?.total_shifts ?? 0} смен
                        </p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <p className="text-xs font-medium">Опоздания</p>
                        </div>
                        <p className="text-2xl font-bold">{stats?.late_count ?? 0}</p>
                        <p className="text-xs text-muted-foreground">раз</p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                          <XCircle className="w-4 h-4" />
                          <p className="text-xs font-medium">Пропуски</p>
                        </div>
                        <p className="text-2xl font-bold">{stats?.absence_count ?? 0}</p>
                        <p className="text-xs text-muted-foreground">дней</p>
                      </div>
                    </div>

                    {/* Средняя продолжительность работы */}
                    {stats?.avg_work_hours && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Среднее время работы</span>
                        </div>
                        <span className="text-lg font-bold">
                          {stats.avg_work_hours.toFixed(1)} ч
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. История */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  История работы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Календарь с отмеченными рабочими днями, пропусками и опозданиями
                </p>
                <Button
                  onClick={() => setShowHistoryModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Открыть историю
                </Button>
              </CardContent>
            </Card>
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

      {/* History Modal - TODO: Implement detailed calendar view */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              История работы - {employee.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Календарь с детальной историей работы будет реализован в следующей версии
            </p>
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                Здесь будет отображаться календарь по месяцам с отмеченными рабочими днями,
                пропусками, опозданиями и выходными
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

