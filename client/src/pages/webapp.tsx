import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Coffee, StopCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface EmployeeData {
  employee: {
    id: string;
    name: string;
    telegram_user_id: string;
  };
  activeShift?: any;
  workIntervals: any[];
  breakIntervals: any[];
  status: 'off_work' | 'working' | 'on_break' | 'unknown';
}

// Mock Telegram WebApp for development
const mockTelegramWebApp = {
  initData: "user=%7B%22id%22%3A123456789%7D",
  initDataUnsafe: { user: { id: 123456789 } },
  ready: () => {},
  expand: () => {},
  close: () => {}
};

export default function WebAppPage() {
  const [telegramId, setTelegramId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = (window as any).Telegram?.WebApp || mockTelegramWebApp;
    tg.ready();
    tg.expand();
    
    // Get user ID from Telegram
    const userId = tg.initDataUnsafe?.user?.id?.toString() || "123456789"; // Mock ID for development
    setTelegramId(userId);
    
    // Get location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setLocation("unknown");
        }
      );
    } else {
      setLocation("not_supported");
    }
  }, []);

  const { data: employeeData, isLoading } = useQuery<EmployeeData>({
    queryKey: ['/api/webapp/employee', telegramId],
    enabled: !!telegramId
  });

  const startShiftMutation = useMutation({
    mutationFn: () =>
      fetch('/api/webapp/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, location })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webapp/employee', telegramId] });
    }
  });

  const endShiftMutation = useMutation({
    mutationFn: () =>
      fetch('/api/webapp/shift/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, location })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webapp/employee', telegramId] });
    }
  });

  const startBreakMutation = useMutation({
    mutationFn: () =>
      fetch('/api/webapp/break/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, location })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webapp/employee', telegramId] });
    }
  });

  const endBreakMutation = useMutation({
    mutationFn: () =>
      fetch('/api/webapp/break/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, location })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webapp/employee', telegramId] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Загружаем данные...</p>
        </div>
      </div>
    );
  }

  if (!employeeData?.employee) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-4">Сотрудник не найден</h2>
            <p className="text-muted-foreground mb-4">
              Обратитесь к администратору для настройки доступа.
            </p>
            <p className="text-xs text-muted-foreground">
              Telegram ID: {telegramId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, activeShift, workIntervals, breakIntervals, status } = employeeData;

  const getStatusBadge = () => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-500" data-testid="badge-status">🟢 На работе</Badge>;
      case 'on_break':
        return <Badge className="bg-yellow-500" data-testid="badge-status">🟡 На перерыве</Badge>;
      case 'off_work':
        return <Badge variant="secondary" data-testid="badge-status">⚫ Не на работе</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status">❓ Неизвестно</Badge>;
    }
  };

  const getCurrentInterval = () => {
    const activeBreak = breakIntervals.find(bi => bi.start_at && !bi.end_at);
    const activeWork = workIntervals.find(wi => wi.start_at && !wi.end_at);
    
    if (activeBreak) {
      return { type: 'break', start: activeBreak.start_at };
    }
    if (activeWork) {
      return { type: 'work', start: activeWork.start_at };
    }
    return null;
  };

  const currentInterval = getCurrentInterval();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" data-testid="text-employee-name">{employee.name}</CardTitle>
            {getStatusBadge()}
          </CardHeader>
        </Card>

        {/* Current Shift Info */}
        {activeShift && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Текущая смена
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Запланировано:</span>
                <span data-testid="text-planned-time">
                  {format(new Date(activeShift.planned_start_at), 'HH:mm', { locale: ru })} - 
                  {format(new Date(activeShift.planned_end_at), 'HH:mm', { locale: ru })}
                </span>
              </div>
              {currentInterval && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {currentInterval.type === 'work' ? 'Работаем с:' : 'На перерыве с:'}
                  </span>
                  <span data-testid="text-current-time">
                    {format(new Date(currentInterval.start), 'HH:mm', { locale: ru })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {status === 'off_work' && (
              <Button
                onClick={() => startShiftMutation.mutate()}
                disabled={startShiftMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-start-shift"
              >
                <Play className="h-4 w-4 mr-2" />
                {startShiftMutation.isPending ? 'Начинаем...' : 'Начать смену'}
              </Button>
            )}

            {status === 'working' && (
              <>
                <Button
                  onClick={() => startBreakMutation.mutate()}
                  disabled={startBreakMutation.isPending}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  data-testid="button-start-break"
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  {startBreakMutation.isPending ? 'Начинаем...' : 'Начать перерыв'}
                </Button>
                <Button
                  onClick={() => endShiftMutation.mutate()}
                  disabled={endShiftMutation.isPending}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  data-testid="button-end-shift"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {endShiftMutation.isPending ? 'Завершаем...' : 'Завершить смену'}
                </Button>
              </>
            )}

            {status === 'on_break' && (
              <Button
                onClick={() => endBreakMutation.mutate()}
                disabled={endBreakMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-end-break"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                {endBreakMutation.isPending ? 'Возвращаемся...' : 'Закончить перерыв'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        {(workIntervals.length > 0 || breakIntervals.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Сегодня</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workIntervals.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Рабочих интервалов:</span>
                  <span data-testid="text-work-intervals">{workIntervals.length}</span>
                </div>
              )}
              {breakIntervals.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Перерывов:</span>
                  <span data-testid="text-break-intervals">{breakIntervals.length}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs text-muted-foreground">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <div>Telegram ID: {telegramId}</div>
              <div>Location: {location}</div>
              <div>Status: {status}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}