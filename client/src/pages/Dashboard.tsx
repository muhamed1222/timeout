import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import ShiftCard from "@/components/ShiftCard";
import RecentActivity, { type ActivityItem } from "@/components/RecentActivity";

type DashboardStats = {
  totalEmployees: number;
  activeShifts: number;
  completedShifts: number;
  exceptions: number;
};

type ActiveShift = {
  id: string;
  employee_id: string;
  employee: {
    full_name: string;
    position: string;
  };
  shift_start: string;
  shift_end: string;
  status: string;
  current_work_interval?: {
    started_at: string;
  } | null;
  current_break_interval?: {
    started_at: string;
  } | null;
  daily_report?: {
    summary: string;
  } | null;
};

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/companies', companyId, 'stats'],
    enabled: !!companyId,
  });

  const { data: activeShifts = [], isLoading: shiftsLoading } = useQuery<ActiveShift[]>({
    queryKey: ['/api/companies', companyId, 'shifts', 'active'],
    enabled: !!companyId,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleAddEmployee = () => {
    toast({
      title: "Добавление сотрудника",
      description: "Функция добавления сотрудника будет доступна в следующей версии",
    });
  };

  const handleFilter = () => {
    toast({
      title: "Фильтры",
      description: "Настройка фильтров будет доступна в следующей версии",
    });
  };

  const handleExport = () => {
    if (!transformedShifts.length) {
      toast({
        title: "Нет данных",
        description: "Нет активных смен для экспорта",
        variant: "destructive"
      });
      return;
    }

    const data = filteredShifts.map(shift => ({
      Сотрудник: shift.employeeName,
      Должность: shift.position,
      Начало: shift.shiftStart,
      Конец: shift.shiftEnd,
      Статус: shift.status,
      Локация: shift.location || '-'
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shifts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Экспорт завершен",
      description: "Данные успешно экспортированы в CSV файл",
    });
  };

  const getShiftStatus = (shift: ActiveShift): "active" | "break" | "late" | "done" => {
    if (shift.status === 'completed') return 'done';
    if (shift.current_break_interval) return 'break';
    if (shift.current_work_interval) return 'active';
    return 'late';
  };

  const transformedShifts = activeShifts.map(shift => ({
    employeeName: shift.employee.full_name,
    position: shift.employee.position,
    shiftStart: new Date(shift.shift_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    shiftEnd: new Date(shift.shift_end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    status: getShiftStatus(shift),
    lastReport: shift.daily_report?.summary || undefined,
    location: undefined
  }));

  const filteredShifts = transformedShifts.filter(shift =>
    shift.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shift.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mockActivities: ActivityItem[] = [];

  if (authLoading || statsLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
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
    <div className="space-y-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Дашборд</h1>
          <p className="text-muted-foreground">Обзор активности сотрудников</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleFilter} data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            Фильтр
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={handleAddEmployee} data-testid="button-add-employee">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Stats */}
      <DashboardStats 
        totalEmployees={stats?.totalEmployees || 0}
        activeShifts={stats?.activeShifts || 0}
        completedShifts={stats?.completedShifts || 0}
        exceptions={stats?.exceptions || 0}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Поиск сотрудников..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Активные смены</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredShifts.map((shift) => (
              <ShiftCard key={shift.employeeName} {...shift} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <RecentActivity activities={[]} />
        </div>
      </div>
    </div>
  );
}