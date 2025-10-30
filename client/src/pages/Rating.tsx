import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Trophy, Medal, Award, Star, AlertTriangle, ArrowUp } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

interface ViolationRule {
  id: string;
  code: string;
  name: string;
  penalty_percent: number;
  is_active: boolean;
  company_id: string;
}

interface Employee {
  id: string;
  full_name: string;
  position?: string;
  company_id: string;
  status: string;
}

interface RatingData {
  employee_id: string;
  rating: number;
}

export default function Rating() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRating | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [violationComment, setViolationComment] = useState<string>('');
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useQuery<Employee[]>({
    queryKey: ['/api/companies', companyId, 'employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/employees`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: periods = [] } = useQuery<RatingPeriod[]>({
    queryKey: ['/api/rating/periods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rating/periods');
      return response.json();
    },
  });

  // Вычисляем период на основе выбранного
  const getPeriodDates = () => {
    if (selectedPeriod === 'current') {
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    } else if (selectedPeriod === 'last') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        periodStart: lastMonth.toISOString().split('T')[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      };
    } else if (selectedPeriod === 'quarter') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = quarter * 3;
      return {
        periodStart: new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0],
        periodEnd: new Date(now.getFullYear(), quarterStartMonth + 3, 0).toISOString().split('T')[0]
      };
    } else if (selectedPeriod === 'year') {
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
        periodEnd: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
      };
    } else {
      // Если выбран конкретный period ID
      const period = periods.find(p => p.id === selectedPeriod);
      if (period) {
        return {
          periodStart: period.start_date,
          periodEnd: period.end_date
        };
      }
      // По умолчанию текущий месяц
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    }
  };

  const { periodStart, periodEnd } = getPeriodDates();

  const { data: ratingData, isLoading: ratingLoading, isError: ratingError } = useQuery<RatingData[]>({
    queryKey: ['/api/companies', companyId, 'ratings', periodStart, periodEnd],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/ratings?periodStart=${periodStart}&periodEnd=${periodEnd}`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: violationRules = [], isLoading: rulesLoading } = useQuery<ViolationRule[]>({
    queryKey: ['/api/companies', companyId, 'violation-rules'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/violation-rules`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const getRatingIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <Star className="w-4 h-4 text-muted-foreground" />;
  };

  const handleAddViolation = (employee: EmployeeRating) => {
    setSelectedEmployee(employee);
    setIsViolationModalOpen(true);
    setSelectedRuleId(null);
    setViolationComment('');
    // Если нет активных правил — предупредим
    const hasActiveRules = (violationRules || []).some((r: ViolationRule) => r.is_active);
    if (!hasActiveRules) {
      toast({
        title: 'Нет активных правил',
        description: 'Сначала добавьте правило в Настройки → Нарушения',
        variant: 'destructive'
      });
    }
  };

  const createViolationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee || !companyId || !selectedRuleId) throw new Error('Не выбрано правило');
      const payload = {
        employee_id: selectedEmployee.id,
        company_id: companyId,
        rule_id: selectedRuleId,
        source: 'manual',
        reason: violationComment || '',
      } as const;
      const res = await apiRequest('POST', '/api/violations', payload);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || 'Не удалось добавить нарушение');
      }
      return body;
    },
    onSuccess: () => {
      toast({ title: 'Нарушение добавлено', description: 'Рейтинг будет пересчитан.' });
      setIsViolationModalOpen(false);
      setSelectedEmployee(null);
      setSelectedRuleId(null);
      setViolationComment('');
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && q.queryKey[0] === '/api/companies'
          && q.queryKey[1] === companyId
          && q.queryKey[2] === 'ratings'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'employees'] });
    },
    onError: async (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Не удалось добавить нарушение';
      toast({ title: 'Ошибка', description: message, variant: 'destructive' });
    },
  });

  const adjustRatingMutation = useMutation({
    mutationFn: async (employee: EmployeeRating) => {
      const body = { delta: 5, periodStart, periodEnd };
      const res = await apiRequest('POST', `/api/rating/employees/${employee.id}/adjust`, body);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Не удалось повысить рейтинг');
      return payload;
    },
    // Оптимистичное обновление шкалы рейтинга
    onMutate: async (employee: EmployeeRating) => {
      await queryClient.cancelQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && q.queryKey[0] === '/api/companies'
          && q.queryKey[1] === companyId
          && q.queryKey[2] === 'ratings'
      });
      const key = ['/api/companies', companyId, 'ratings', periodStart, periodEnd];
      const previous = queryClient.getQueryData<RatingData[]>(key);
      const next = (() => {
        const map = new Map<string, number>((previous || []).map(r => [r.employee_id, Number(r.rating)]));
        const current = map.get(employee.id) ?? 100;
        const updated = Math.max(0, Math.min(100, current + 5));
        map.set(employee.id, updated);
        return Array.from(map.entries()).map(([employee_id, rating]) => ({ employee_id, rating }));
      })();
      queryClient.setQueryData(key, next);
      return { previous, key };
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx?.key) {
        queryClient.setQueryData(ctx.key as any, ctx.previous);
      }
      const m = err instanceof Error ? err.message : 'Не удалось повысить рейтинг';
      toast({ title: 'Ошибка', description: m, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Рейтинг повышен', description: '+5% к рейтингу' });
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && q.queryKey[0] === '/api/companies'
          && q.queryKey[1] === companyId
          && q.queryKey[2] === 'ratings'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'employees'] });
    }
  });

  // Сливаем сотрудников с реальными рейтингами; по умолчанию 100%
  const ratingsMap = new Map<string, number>((ratingData || []).map((r: RatingData) => [r.employee_id, Number(r.rating)]));
  const employeesWithRating: EmployeeRating[] = (employees || []).map((emp: Employee) => ({
    id: emp.id,
    full_name: emp.full_name,
    position: emp.position,
    rating: ratingsMap.has(emp.id) ? Math.round(Number(ratingsMap.get(emp.id))) : 100
  }));

  const filteredEmployees = employeesWithRating.filter((emp: EmployeeRating) =>
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

  if (authLoading || employeesLoading || ratingLoading) {
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
      {(employeesError || ratingError) && (
        <Alert variant="destructive">
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription>
            Не удалось загрузить данные рейтинга. Попробуйте обновить страницу позже.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рейтинг сотрудников</h1>
          <p className="text-muted-foreground">
            Анализ производительности и эффективности команды
          </p>
        </div>
      </div>

      {/* Rating Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedEmployees.map((employee: EmployeeRating, index: number) => (
          <Card key={employee.id} className="hover-elevate" data-testid={`rating-card-${employee.id}`}>
            <CardHeader className="pb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getRatingIcon(index + 1)}
                  <CardTitle className="text-base truncate">{employee.full_name}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
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
                    employee.rating <= 0 ? (
                      <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                        🚫 Увольнение: рейтинг достиг 0%
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                        🚨 Критический рейтинг
                      </span>
                    )
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
                <div className="mt-2" />
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => adjustRatingMutation.mutate(employee)}
                  disabled={adjustRatingMutation.isPending}
                  data-testid={`button-boost-rating-${employee.id}`}
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Повысить рейтинг (+5%)
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
                <Select value={selectedRuleId ?? undefined} onValueChange={setSelectedRuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder={rulesLoading ? 'Загрузка...' : 'Выберите тип нарушения'} />
                  </SelectTrigger>
                  <SelectContent>
                    {violationRules
                      .filter((r: ViolationRule) => r.is_active)
                      .map((rule: ViolationRule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.name} ({rule.penalty_percent}%)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Комментарий</label>
                <Input
                  placeholder="Описание нарушения (необязательно)"
                  value={violationComment}
                  onChange={(e) => setViolationComment(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViolationModalOpen(false);
                    setSelectedEmployee(null);
                    setSelectedRuleId(null);
                    setViolationComment('');
                  }}
                >
                  Отмена
                </Button>
                <Button
                  disabled={!selectedRuleId || createViolationMutation.isPending || !(violationRules || []).some((r: ViolationRule) => r.is_active)}
                  onClick={() => createViolationMutation.mutate()}
                >
                  {createViolationMutation.isPending ? 'Сохранение...' : 'Добавить нарушение'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
