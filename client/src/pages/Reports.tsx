import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Download, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type DailyReport = {
  id: string;
  shift_id: string;
  summary: string;
  notes: string | null;
  submitted_at: string;
  shift: {
    employee: {
      full_name: string;
      position: string;
    };
    shift_date: string;
  };
};

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const { data: reports = [], isLoading } = useQuery<DailyReport[]>({
    queryKey: ['/api/companies', companyId, 'daily-reports'],
    enabled: !!companyId,
  });

  const handleExport = () => {
    if (!filteredReports.length) {
      toast({
        title: "Нет данных",
        description: "Нет отчетов для экспорта",
        variant: "destructive"
      });
      return;
    }

    const data = filteredReports.map(report => ({
      Дата: format(new Date(report.shift.shift_date), 'dd.MM.yyyy', { locale: ru }),
      Сотрудник: report.shift.employee.full_name,
      Должность: report.shift.employee.position,
      Отчет: report.summary,
      Примечания: report.notes || '-',
      Отправлен: format(new Date(report.submitted_at), 'dd.MM.yyyy HH:mm', { locale: ru })
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reports_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "Экспорт завершен",
      description: "Отчеты экспортированы в CSV файл",
    });
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.shift.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.notes && report.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDate = !selectedDate || report.shift.shift_date === selectedDate;
    
    return matchesSearch && matchesDate;
  });

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
    <div className="space-y-6" data-testid="page-reports">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Отчеты</h1>
          <p className="text-muted-foreground">Ежедневные отчеты сотрудников</p>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export-reports">
          <Download className="w-4 h-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по сотруднику или тексту отчета..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-reports"
          />
        </div>
        <div className="relative sm:w-48">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-10"
            data-testid="input-date-filter"
          />
        </div>
      </div>

      {selectedDate && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Дата: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: ru })}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate('')} data-testid="button-clear-date">
            Очистить
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover-elevate" data-testid={`report-card-${report.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar>
                    <AvatarFallback>
                      {report.shift.employee.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{report.shift.employee.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">{report.shift.employee.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {format(new Date(report.shift.shift_date), 'dd MMM', { locale: ru })}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(report.submitted_at), 'HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Отчет:</p>
                <p className="text-sm">{report.summary}</p>
              </div>
              {report.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Примечания:</p>
                  <p className="text-sm text-muted-foreground">{report.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
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
