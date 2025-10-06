import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Trophy, Medal, Award, Star, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeRating {
  id: string;
  full_name: string;
  position?: string;
  rating: number; // Основной рейтинг от 0 до 100
}

interface RatingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export default function Rating() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRating | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const { companyId, loading: authLoading } = useAuth();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/companies', companyId, 'employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/employees`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: ratingData, isLoading: ratingLoading } = useQuery({
    queryKey: ['/api/companies', companyId, 'ratings', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/ratings?period=${selectedPeriod}`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: periods } = useQuery({
    queryKey: ['/api/rating/periods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rating/periods');
      return response.json();
    },
  });

  const getRatingIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <Star className="w-4 h-4 text-muted-foreground" />;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 90) return 'text-green-600';
    if (rating >= 80) return 'text-blue-600';
    if (rating >= 70) return 'text-yellow-600';
    if (rating >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBadgeVariant = (rating: number) => {
    if (rating >= 90) return 'default';
    if (rating >= 80) return 'secondary';
    if (rating >= 70) return 'outline';
    return 'destructive';
  };

  const handleAddViolation = (employee: EmployeeRating) => {
    setSelectedEmployee(employee);
    setIsViolationModalOpen(true);
  };

  // Создаем данные рейтинга на основе сотрудников, если нет реальных данных
  const employeesWithRating = employees?.map((emp: any, index: number) => ({
    id: emp.id,
    full_name: emp.full_name,
    position: emp.position,
    rating: 100 // Базовый рейтинг
  })) || [];

  const filteredEmployees = employeesWithRating.filter((emp: any) =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'name':
        return a.full_name.localeCompare(b.full_name);
      default:
        return b.rating - a.rating;
    }
  });

  if (authLoading || employeesLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рейтинг сотрудников</h1>
          <p className="text-muted-foreground">
            Анализ производительности и эффективности команды
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск сотрудников..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-employees"
          />
        </div>
        
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Текущий месяц</SelectItem>
            <SelectItem value="last">Прошлый месяц</SelectItem>
            <SelectItem value="quarter">Квартал</SelectItem>
            <SelectItem value="year">Год</SelectItem>
            {periods?.map((period: RatingPeriod) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">По рейтингу</SelectItem>
            <SelectItem value="name">По имени</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rating Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedEmployees.map((employee: EmployeeRating, index: number) => (
          <Card key={employee.id} className="hover-elevate" data-testid={`rating-card-${employee.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{employee.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getRatingIcon(index + 1)}
                    <CardTitle className="text-base truncate">{employee.full_name}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                </div>
                <Badge 
                  variant={getRatingBadgeVariant(employee.rating)}
                  className={`${getRatingColor(employee.rating)} font-semibold`}
                >
                  {employee.rating}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Простая визуализация рейтинга */}
              <div className="space-y-4">
                {/* Прогресс-бар рейтинга */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Рейтинг</span>
                    <span className="text-lg font-bold">{employee.rating}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        employee.rating >= 80 ? 'bg-green-500' :
                        employee.rating >= 60 ? 'bg-yellow-500' :
                        employee.rating >= 40 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${employee.rating}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Статус рейтинга */}
                <div className="text-center">
                  {employee.rating >= 80 ? (
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      ✅ Отличный рейтинг
                    </span>
                  ) : employee.rating >= 60 ? (
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      ⚠️ Хороший рейтинг
                    </span>
                  ) : employee.rating >= 40 ? (
                    <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                      ⚠️ Низкий рейтинг
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                      🚨 Критический рейтинг
                    </span>
                  )}
                </div>
              </div>

              {/* Кнопка добавления нарушения */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAddViolation(employee)}
                  data-testid={`button-add-violation-${employee.id}`}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Добавить нарушение
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedEmployees.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Нет данных для отображения</h3>
          <p className="text-muted-foreground">
            Выберите другой период или проверьте настройки рейтинга
          </p>
        </div>
      )}

      {/* Модальное окно добавления нарушения */}
      {isViolationModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Добавить нарушение для {selectedEmployee.full_name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Тип нарушения</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип нарушения" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late">Опоздание</SelectItem>
                    <SelectItem value="no_report">Отсутствие отчёта</SelectItem>
                    <SelectItem value="missed_shift">Пропуск смены</SelectItem>
                    <SelectItem value="incorrect_report">Некорректный отчёт</SelectItem>
                    <SelectItem value="discipline_violation">Нарушение дисциплины</SelectItem>
                    <SelectItem value="long_break">Превышение времени перерыва</SelectItem>
                    <SelectItem value="early_leave">Преждевременное завершение смены</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Комментарий</label>
                <Input placeholder="Описание нарушения (необязательно)" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViolationModalOpen(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Реализовать добавление нарушения
                    setIsViolationModalOpen(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Добавить нарушение
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
