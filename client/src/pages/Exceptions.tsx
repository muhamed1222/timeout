import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import ExceptionCard, { type ExceptionType } from "@/components/ExceptionCard";
import employeeImage from '@assets/generated_images/Professional_employee_avatar_7b6fbe18.png';

export default function Exceptions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ExceptionType | null>(null);

  //todo: remove mock functionality
  const mockExceptions = [
    {
      employeeName: "Анна Петрова",
      employeeImage: employeeImage,
      type: "late" as const,
      description: "Опоздание на 25 минут. Смена должна была начаться в 09:00",
      timestamp: "09:25",
      severity: 2 as const
    },
    {
      employeeName: "Михаил Сидоров", 
      type: "no_report" as const,
      description: "Не подал ежедневный отчет за вчера",
      timestamp: "Вчера",
      severity: 1 as const
    },
    {
      employeeName: "Елена Козлова",
      type: "no_show" as const, 
      description: "Не вышел на работу, не предупредил заранее",
      timestamp: "08:00",
      severity: 3 as const
    },
    {
      employeeName: "Дмитрий Волков",
      type: "long_break" as const,
      description: "Перерыв длится уже 1 час 15 минут",
      timestamp: "14:15",
      severity: 2 as const
    },
    {
      employeeName: "Ольга Морозова",
      type: "short_day" as const,
      description: "Смена завершена на 2 часа раньше без согласования",
      timestamp: "16:00",
      severity: 1 as const
    }
  ];

  const severityLabels = {
    1: { label: "Низкая", color: "bg-yellow-100 text-yellow-800" },
    2: { label: "Средняя", color: "bg-orange-100 text-orange-800" },
    3: { label: "Высокая", color: "bg-red-100 text-red-800" }
  };

  const typeLabels = {
    late: "Опоздание",
    no_report: "Нет отчета", 
    short_day: "Короткий день",
    long_break: "Долгий перерыв",
    no_show: "Не явился"
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    console.log('Search query:', value);
  };

  const handleSeverityFilter = (severity: number) => {
    setSelectedSeverity(selectedSeverity === severity ? null : severity);
    console.log('Filter by severity:', severity);
  };

  const handleTypeFilter = (type: ExceptionType) => {
    setSelectedType(selectedType === type ? null : type);
    console.log('Filter by type:', type);
  };

  const clearFilters = () => {
    setSelectedSeverity(null);
    setSelectedType(null);
    setSearchQuery('');
  };

  const filteredExceptions = mockExceptions.filter(exception => {
    const matchesSearch = exception.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exception.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === null || exception.severity === selectedSeverity;
    const matchesType = selectedType === null || exception.type === selectedType;
    
    return matchesSearch && matchesSeverity && matchesType;
  });

  const hasFilters = selectedSeverity !== null || selectedType !== null || searchQuery.length > 0;

  return (
    <div className="space-y-6" data-testid="page-exceptions">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Исключения</h1>
          <p className="text-muted-foreground">Мониторинг нарушений и проблем</p>
        </div>
        <Badge variant={mockExceptions.length > 0 ? "destructive" : "secondary"}>
          {mockExceptions.length} активных
        </Badge>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск исключений..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-exceptions"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Важность:</span>
            {Object.entries(severityLabels).map(([severity, config]) => (
              <Badge
                key={severity}
                variant={selectedSeverity === parseInt(severity) ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => handleSeverityFilter(parseInt(severity))}
                data-testid={`filter-severity-${severity}`}
              >
                {config.label}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Тип:</span>
            {Object.entries(typeLabels).map(([type, label]) => (
              <Badge
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => handleTypeFilter(type as ExceptionType)}
                data-testid={`filter-type-${type}`}
              >
                {label}
              </Badge>
            ))}
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>
      </div>

      {/* Exception Cards */}
      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {hasFilters ? "Исключения не найдены" : "Нет активных исключений"}
            </p>
          </div>
        ) : (
          filteredExceptions.map((exception, index) => (
            <ExceptionCard key={index} {...exception} />
          ))
        )}
      </div>
    </div>
  );
}