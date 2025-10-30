import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ExceptionCard, { type ExceptionType } from "@/components/ExceptionCard";

type ExceptionData = {
  id: string;
  employee: {
    full_name: string;
  };
  exception_type: string;
  description: string;
  detected_at: string;
  severity: 1 | 2 | 3;
};

export default function Exceptions() {
  const [searchQuery, setSearchQuery] = useState('');
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: exceptions = [], isLoading } = useQuery<ExceptionData[]>({
    queryKey: ['/api/companies', companyId, 'exceptions'],
    enabled: !!companyId,
  });

  const resolveExceptionMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/exceptions/${exceptionId}/resolve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'exceptions'] });
      toast({
        title: "Нарушение разрешено",
        description: "Нарушение успешно помечено как решенное",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось разрешить нарушение",
        variant: "destructive",
      });
    }
  });

  // По запросу заказчика поиск отключен

  const mapExceptionType = (type: string): ExceptionType => {
    const typeMap: Record<string, ExceptionType> = {
      'late_arrival': 'late',
      'early_departure': 'short_day',
      'extended_break': 'long_break',
      'no_report': 'no_report',
      'no_show': 'no_show'
    };
    return typeMap[type] || 'no_show';
  };

  const handleResolveException = (exceptionId: string, employeeName: string) => {
    if (confirm(`Вы уверены, что хотите разрешить это исключение для ${employeeName}?`)) {
      resolveExceptionMutation.mutate(exceptionId);
    }
  };

  const handleContactEmployee = (employeeName: string) => {
    toast({
      title: "Функция в разработке",
      description: `Отправка сообщения для ${employeeName} будет доступна в следующей версии`,
    });
  };

  const transformedExceptions = exceptions.map(exc => ({
    id: exc.id,
    employeeName: exc.employee.full_name,
    type: mapExceptionType(exc.exception_type),
    description: exc.description,
    timestamp: new Date(exc.detected_at).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }),
    severity: exc.severity
  }));

  const filteredExceptions = transformedExceptions; // поиск отключен

  const hasFilters = false;

  if (authLoading || isLoading) {
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
    <div className="space-y-6" data-testid="page-exceptions">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Нарушения</h1>
          <p className="text-muted-foreground">Мониторинг нарушений и проблем</p>
        </div>
      </div>

      {/* Search removed by request */}

      {/* Exception Cards */}
      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {hasFilters ? "Нарушения не найдены" : "Нет активных нарушений"}
            </p>
          </div>
        ) : (
          filteredExceptions.map((exception) => (
            <ExceptionCard 
              key={exception.id} 
              {...exception}
              onResolve={() => handleResolveException(exception.id, exception.employeeName)}
              onContact={() => handleContactEmployee(exception.employeeName)}
            />
          ))
        )}
      </div>
    </div>
  );
}