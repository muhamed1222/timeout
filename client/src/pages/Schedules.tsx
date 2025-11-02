import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Loader2, Calendar, Clock, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ScheduleTemplate = {
  id: string;
  company_id: string;
  name: string;
  rules: {
    shift_start: string;
    shift_end: string;
    workdays: number[];
  };
};

type Employee = {
  id: string;
  full_name: string;
  position: string;
  status: string;
};

type EmployeeSchedule = {
  employee_id: string;
  schedule_id: string;
  valid_from: string;
  valid_to: string | null;
  schedule: ScheduleTemplate;
};

const templateFormSchema = z.object({
  name: z.string().min(1, "Введите название графика"),
  shift_start: z.string().min(1, "Укажите время начала"),
  shift_end: z.string().min(1, "Укажите время окончания"),
  workdays: z.array(z.number()).min(1, "Выберите хотя бы один рабочий день")
});

const assignFormSchema = z.object({
  employee_id: z.string().min(1, "Выберите сотрудника"),
  schedule_id: z.string().min(1, "Выберите график"),
  valid_from: z.string().min(1, "Укажите дату начала"),
  valid_to: z.string().optional()
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;
type AssignFormValues = z.infer<typeof assignFormSchema>;

const weekDays = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" }
];

export default function Schedules() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedWorkdays, setSelectedWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: ['/api/companies', companyId, 'schedule-templates'],
    enabled: !!companyId,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/companies', companyId, 'employees'],
    enabled: !!companyId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues): Promise<ScheduleTemplate> => {
      const response = await apiRequest('POST', `/api/schedule-templates`, {
        company_id: companyId,
        name: data.name,
        rules: {
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          workdays: data.workdays
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'schedule-templates'] });
      templateForm.reset();
      setIsTemplateOpen(false);
      toast({
        title: "График создан",
        description: "Шаблон графика успешно создан"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать график",
        variant: "destructive"
      });
    }
  });

  const assignScheduleMutation = useMutation({
    mutationFn: async (data: AssignFormValues) => {
      const response = await apiRequest('POST', `/api/employee-schedule`, {
        employee_id: data.employee_id,
        schedule_id: data.schedule_id,
        valid_from: data.valid_from,
        valid_to: data.valid_to || null
      });
      return response.json();
    },
    onSuccess: () => {
      assignForm.reset();
      setIsAssignOpen(false);
      toast({
        title: "График назначен",
        description: "График успешно назначен сотруднику"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить график",
        variant: "destructive"
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/schedule-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'schedule-templates'] });
      toast({
        title: "График удален",
        description: "Шаблон графика успешно удален"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить график",
        variant: "destructive"
      });
    }
  });

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  });

  const generateShiftsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/generate-shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          startDate,
          endDate,
          ...(selectedEmployees.length > 0 && { employeeIds: selectedEmployees })
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось сгенерировать смены');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerateOpen(false);
      setSelectedEmployees([]);
      toast({
        title: "Смены сгенерированы",
        description: data.message || `Создано ${data.shifts?.length || 0} смен`
      });
      // Инвалидируем кэш смен
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'shifts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать смены",
        variant: "destructive"
      });
    }
  });

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      shift_start: "09:00",
      shift_end: "18:00",
      workdays: [1, 2, 3, 4, 5]
    }
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      employee_id: "",
      schedule_id: "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: ""
    }
  });

  const onTemplateSubmit = (data: TemplateFormValues) => {
    createTemplateMutation.mutate({ ...data, workdays: selectedWorkdays });
  };

  const onAssignSubmit = (data: AssignFormValues) => {
    assignScheduleMutation.mutate(data);
  };

  const toggleWorkday = (day: number) => {
    setSelectedWorkdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || templatesLoading) {
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
    <div className="space-y-6" data-testid="page-schedules">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Графики работы</h1>
          <p className="text-muted-foreground">Управление расписанием сотрудников</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" data-testid="button-generate-shifts">
                <Calendar className="w-4 h-4 mr-2" />
                Сгенерировать смены
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Сгенерировать смены из графика</DialogTitle>
                <DialogDescription>
                  Создайте конкретные смены на основе графиков работы для выбранного периода. После генерации бот сможет видеть запланированные смены.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Период генерации</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Дата начала</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Дата окончания</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Сотрудники (опционально)</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Если не выбраны, смены будут созданы для всех сотрудников с назначенными графиками
                  </p>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {employeesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : employees.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">Нет сотрудников</p>
                    ) : (
                      employees.map(emp => (
                        <label key={emp.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees([...selectedEmployees, emp.id]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{emp.full_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsGenerateOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={() => generateShiftsMutation.mutate()}
                    disabled={generateShiftsMutation.isPending || !startDate || !endDate || templates.length === 0}
                    data-testid="button-confirm-generate"
                  >
                    {generateShiftsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Сгенерировать
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-assign-schedule">
                <Calendar className="w-4 h-4 mr-2" />
                Назначить график
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Назначить график сотруднику</DialogTitle>
                <DialogDescription>
                  Выберите сотрудника и график для назначения
                </DialogDescription>
              </DialogHeader>
              <Form {...assignForm}>
                <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
                  <FormField
                    control={assignForm.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сотрудник</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-employee">
                              <SelectValue placeholder="Выберите сотрудника" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name} - {emp.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="schedule_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>График</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-schedule">
                              <SelectValue placeholder="Выберите график" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата начала</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="valid_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата окончания (необязательно)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={assignScheduleMutation.isPending}
                      data-testid="button-submit-assign"
                    >
                      {assignScheduleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Назначить
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Создать график
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать шаблон графика</DialogTitle>
                <DialogDescription>
                  Настройте параметры рабочего графика
                </DialogDescription>
              </DialogHeader>
              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название</FormLabel>
                        <FormControl>
                          <Input placeholder="Стандартный график" {...field} data-testid="input-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={templateForm.control}
                      name="shift_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Начало смены</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-shift-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="shift_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Конец смены</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-shift-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormLabel>Рабочие дни</FormLabel>
                    <div className="flex gap-2 mt-2">
                      {weekDays.map(day => (
                        <Badge
                          key={day.value}
                          variant={selectedWorkdays.includes(day.value) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleWorkday(day.value)}
                          data-testid={`workday-${day.value}`}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending}
                      data-testid="button-submit-template"
                    >
                      {createTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Создать
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Поиск графиков..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-schedules"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover-elevate" data-testid={`template-card-${template.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-3 h-3" />
                      {template.rules.shift_start} - {template.rules.shift_end}
                    </div>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                  disabled={deleteTemplateMutation.isPending}
                  data-testid={`button-delete-${template.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Рабочие дни:</p>
                <div className="flex flex-wrap gap-1">
                  {template.rules.workdays.sort((a, b) => a - b).map(day => {
                    const dayLabel = weekDays.find(d => d.value === day)?.label || day;
                    return (
                      <Badge key={day} variant="secondary" className="text-xs">
                        {dayLabel}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Графики не найдены</p>
          <p className="text-sm text-muted-foreground mt-2">Создайте первый график работы</p>
        </div>
      )}
    </div>
  );
}
