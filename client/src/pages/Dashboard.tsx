import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/DashboardStats";
import ShiftCard from "@/components/ShiftCard";
import RecentActivity, { type ActivityItem } from "@/components/RecentActivity";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";
import ShiftDetailsModal from "@/components/ShiftDetailsModal";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { EmptyState } from "@/components/EmptyState";

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

interface TransformedShift {
  id: string;
  employeeName: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  status: "active" | "break" | "late" | "done";
  lastReport?: string;
  location?: string;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<TransformedShift | null>(null);
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  // Fetch company stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<CompanyStats>({
    queryKey: ['/api/companies', companyId, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000,
  });

  // Fetch active shifts
  const { data: activeShifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery<ActiveShift[]>({
    queryKey: ['/api/companies', companyId, 'shifts', 'active'],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/shifts/active`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      return res.json();
    },
    enabled: !!companyId,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleAddEmployee = () => {
    setShowAddEmployeeModal(true);
  };

  const handleViewShiftDetails = (shift: typeof transformedShifts[0]) => {
    setSelectedShift(shift);
    setShowShiftDetails(true);
  };

  const handleSendMessage = (employeeName: string) => {
    toast({
      title: "Функция в разработке",
      description: `Отправка сообщения для ${employeeName} будет доступна в следующей версии`,
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
    if (shift.status === 'active') return 'active';
    if (shift.status === 'planned' && shift.actual_start_at === null) {
      const now = new Date();
      const plannedStart = new Date(shift.planned_start_at);
      if (now > plannedStart) return 'late';
    }
    return 'active';
  };

  const transformedShifts: TransformedShift[] = activeShifts.map(shift => ({
    id: shift.id,
    employeeName: shift.employee.full_name,
    position: shift.employee.position || 'Сотрудник',
    shiftStart: new Date(shift.planned_start_at).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    shiftEnd: new Date(shift.planned_end_at).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    status: getShiftStatus(shift),
    lastReport: undefined,
    location: undefined
  }));

  const filteredShifts = transformedShifts;

  // Generate activities based on real data
  const recentActivities: ActivityItem[] = activeShifts
    .flatMap((shift) => {
      const activities: ActivityItem[] = [];
      
      // Add shift start event
      if (shift.actual_start_at) {
        activities.push({
          id: `start-${shift.id}`,
          type: 'shift_start',
          employeeName: shift.employee.full_name,
          employeeImage: undefined,
          description: 'Начал смену',
          timestamp: new Date(shift.actual_start_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      }
      
      // Add shift end event
      if (shift.status === 'completed' && shift.actual_end_at) {
        activities.push({
          id: `end-${shift.id}`,
          type: 'shift_end',
          employeeName: shift.employee.full_name,
          employeeImage: undefined,
          description: 'Завершил смену',
          timestamp: new Date(shift.actual_end_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      }
      
      return activities;
    })
    .sort((a, b) => {
      const timeA = new Date(`1970-01-01 ${a.timestamp}`).getTime();
      const timeB = new Date(`1970-01-01 ${b.timestamp}`).getTime();
      return timeB - timeA;
    })
    .slice(0, 10);

  // Loading state
  if (authLoading || statsLoading || shiftsLoading) {
    return <DashboardSkeleton />;
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
        <Button onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Активные смены</h2>
          {filteredShifts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Нет активных смен"
              description="Пока нет активных смен. Добавьте сотрудников и создайте расписание для начала работы."
              action={{
                label: "Добавить сотрудника",
                onClick: handleAddEmployee
              }}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredShifts.map((shift) => (
                <ShiftCard 
                  key={shift.id} 
                  {...shift}
                  onViewDetails={() => handleViewShiftDetails(shift)}
                  onSendMessage={() => handleSendMessage(shift.employeeName)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <RecentActivity activities={recentActivities} />
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal 
        open={showAddEmployeeModal} 
        onOpenChange={setShowAddEmployeeModal} 
      />

      {/* Shift Details Modal */}
      {selectedShift && (
        <ShiftDetailsModal
          open={showShiftDetails}
          onOpenChange={setShowShiftDetails}
          employeeName={selectedShift.employeeName}
          position={selectedShift.position}
          shiftStart={selectedShift.shiftStart}
          shiftEnd={selectedShift.shiftEnd}
          status={selectedShift.status}
          location={selectedShift.location}
          lastReport={selectedShift.lastReport}
        />
      )}
    </div>
  );
}