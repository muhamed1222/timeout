import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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


const templateFormSchema = z.object({
  name: z.string().min(1, "Введите название графика"),
  shift_start: z.string().min(1, "Укажите время начала"),
  shift_end: z.string().min(1, "Укажите время окончания"),
  workdays: z.array(z.number()).min(1, "Выберите хотя бы один рабочий день"),
});

const assignFormSchema = z.object({
  employee_id: z.string().min(1, "Выберите сотрудника"),
  schedule_id: z.string().min(1, "Выберите график"),
  valid_from: z.string().min(1, "Укажите дату начала"),
  valid_to: z.string().optional(),
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
  { value: 0, label: "Вс" },
];

export default function Schedules() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const [selectedWorkdays, setSelectedWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState<string[]>([]);
  const [bulkScheduleId, setBulkScheduleId] = useState("");
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: ["/api/companies", companyId, "schedule-templates"],
    enabled: !!companyId,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/companies", companyId, "employees"],
    enabled: !!companyId,
  });

  const { data: employeeSchedules = [] } = useQuery<Array<{
    employee_id: string;
    schedule_id: string;
    valid_from: string;
    valid_to: string | null;
    employee: { id: string; full_name: string; position: string };
    schedule: ScheduleTemplate;
  }>>({
    queryKey: ["/api/companies", companyId, "employee-schedules"],
    enabled: !!companyId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues): Promise<ScheduleTemplate> => {
      const response = await apiRequest("POST", "/api/schedule-templates", {
        company_id: companyId,
        name: data.name,
        rules: {
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          workdays: data.workdays,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "schedule-templates"] });
      templateForm.reset();
      setSelectedWorkdays([1, 2, 3, 4, 5]);
      setEditingTemplate(null);
      setIsTemplateOpen(false);
      toast({
        title: "График создан",
        description: "Шаблон графика успешно создан",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать график",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormValues }): Promise<ScheduleTemplate> => {
      const response = await apiRequest("PUT", `/api/schedule-templates/${id}`, {
        name: data.name,
        rules: {
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          workdays: data.workdays,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "schedule-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employee-schedules"] });
      templateForm.reset();
      setSelectedWorkdays([1, 2, 3, 4, 5]);
      setEditingTemplate(null);
      setIsTemplateOpen(false);
      toast({
        title: "График обновлен",
        description: "Шаблон графика успешно обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить график",
        variant: "destructive",
      });
    },
  });

  const assignScheduleMutation = useMutation({
    mutationFn: async (data: AssignFormValues) => {
      const response = await apiRequest("POST", "/api/employee-schedule", {
        employee_id: data.employee_id,
        schedule_id: data.schedule_id,
        valid_from: data.valid_from,
        valid_to: data.valid_to || null,
      });
      return response.json();
    },
    onSuccess: () => {
      assignForm.reset();
      setIsAssignOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employee-schedules"] });
      toast({
        title: "График назначен",
        description: "График успешно назначен сотруднику",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить график",
        variant: "destructive",
      });
    },
  });

  const bulkAssignScheduleMutation = useMutation({
    mutationFn: async ({ employeeIds, scheduleId, validFrom, validTo }: {
      employeeIds: string[];
      scheduleId: string;
      validFrom: string;
      validTo?: string;
    }): Promise<unknown[]> => {
      const promises = employeeIds.map(employeeId =>
        apiRequest("POST", "/api/employee-schedule", {
          employee_id: employeeId,
          schedule_id: scheduleId,
          valid_from: validFrom,
          valid_to: validTo ?? null,
        }).then(res => res.json()),
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      setBulkSelectedEmployees([]);
      setBulkScheduleId("");
      setIsBulkAssignOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employee-schedules"] });
      toast({
        title: "Графики назначены",
        description: `График успешно назначен ${variables.employeeIds.length} сотрудник(ам)`,
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить графики",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/schedule-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "schedule-templates"] });
      toast({
        title: "График удален",
        description: "Шаблон графика успешно удален",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить график",
        variant: "destructive",
      });
    },
  });

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
  });

  const generateShiftsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/generate-shifts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          startDate,
          endDate,
          ...(selectedEmployees.length > 0 && { employeeIds: selectedEmployees }),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Не удалось сгенерировать смены");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerateOpen(false);
      setSelectedEmployees([]);
      const stats = data.stats ?? {};
      const message = stats.employeesWithoutSchedule 
        ? `${data.message}. Пропущено ${stats.employeesWithoutSchedule} сотрудник(ов) без назначенного графика`
        : data.message;
      toast({
        title: "Смены сгенерированы",
        description: message ?? `Создано ${data.shifts?.length ?? 0} смен`,
        variant: stats.employeesWithoutSchedule ? "default" : "default",
      });
      // Инвалидируем кэш смен
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "shifts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать смены",
        variant: "destructive",
      });
    },
  });

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      shift_start: "09:00",
      shift_end: "18:00",
      workdays: [1, 2, 3, 4, 5],
    },
  });

  // Заполнить форму при редактировании
  const handleEditTemplate = (template: ScheduleTemplate): void => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      shift_start: template.rules.shift_start,
      shift_end: template.rules.shift_end,
      workdays: template.rules.workdays,
    });
    setSelectedWorkdays(template.rules.workdays);
    setIsTemplateOpen(true);
  };

  // Открыть диалог создания
  const handleCreateTemplate = (): void => {
    setEditingTemplate(null);
    templateForm.reset({
      name: "",
      shift_start: "09:00",
      shift_end: "18:00",
      workdays: [1, 2, 3, 4, 5],
    });
    setSelectedWorkdays([1, 2, 3, 4, 5]);
    setIsTemplateOpen(true);
  };

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      employee_id: "",
      schedule_id: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: "",
    },
  });

  const onTemplateSubmit = (data: TemplateFormValues): void => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ 
        id: editingTemplate.id, 
        data: { ...data, workdays: selectedWorkdays }, 
      });
    } else {
      createTemplateMutation.mutate({ ...data, workdays: selectedWorkdays });
    }
  };

  const onAssignSubmit = (data: AssignFormValues): void => {
    assignScheduleMutation.mutate(data);
  };

  const toggleWorkday = (day: number): void => {
    setSelectedWorkdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
          <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setBulkSelectedEmployees([]);
                setBulkScheduleId("");
                setIsBulkAssignOpen(true);
              }} data-testid="button-bulk-assign-schedule">
                <Calendar className="w-4 h-4 mr-2" />
                Массовое назначение
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Массовое назначение графика</DialogTitle>
                <DialogDescription>
                  Выберите график и сотрудников для назначения
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">График</label>
                  <Select value={bulkScheduleId} onValueChange={setBulkScheduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите график" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Дата начала</label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border rounded-md"
                    id="bulk-valid-from"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Дата окончания (необязательно)</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    id="bulk-valid-to"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Сотрудники</label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                    {employeesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : employees.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">Нет сотрудников</p>
                    ) : (
                      <>
                        <label className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                          <input
                            type="checkbox"
                            checked={bulkSelectedEmployees.length === employees.length && employees.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedEmployees(employees.map(emp => emp.id));
                              } else {
                                setBulkSelectedEmployees([]);
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">Выбрать всех</span>
                        </label>
                        <div className="border-t pt-1 mt-1" />
                        {employees.map(emp => (
                          <label key={emp.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                            <input
                              type="checkbox"
                              checked={bulkSelectedEmployees.includes(emp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkSelectedEmployees([...bulkSelectedEmployees, emp.id]);
                                } else {
                                  setBulkSelectedEmployees(bulkSelectedEmployees.filter(id => id !== emp.id));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{emp.full_name}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkAssignOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={() => {
                      const validFromInput = window.document.getElementById("bulk-valid-from") as HTMLInputElement;
                      const validToInput = window.document.getElementById("bulk-valid-to") as HTMLInputElement;
                      const validFrom = validFromInput?.value;
                      const validTo = validToInput?.value;
                      if (!bulkScheduleId || !validFrom || bulkSelectedEmployees.length === 0) {
                        toast({
                          title: "Ошибка",
                          description: "Заполните все обязательные поля",
                          variant: "destructive",
                        });
                        return;
                      }
                      bulkAssignScheduleMutation.mutate({
                        employeeIds: bulkSelectedEmployees,
                        scheduleId: bulkScheduleId,
                        validFrom,
                        validTo: validTo || undefined,
                      });
                    }}
                    disabled={bulkAssignScheduleMutation.isPending || !bulkScheduleId || bulkSelectedEmployees.length === 0}
                  >
                    {bulkAssignScheduleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Назначить ({bulkSelectedEmployees.length})
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
          
          <Dialog open={isTemplateOpen} onOpenChange={(open) => {
            setIsTemplateOpen(open);
            if (!open) {
              setEditingTemplate(null);
              templateForm.reset();
              setSelectedWorkdays([1, 2, 3, 4, 5]);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                handleCreateTemplate(); 
              }} data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Создать график
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Редактировать шаблон графика" : "Создать шаблон графика"}
                </DialogTitle>
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
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      data-testid="button-submit-template"
                    >
                      {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingTemplate ? "Сохранить" : "Создать"}
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
        {filteredTemplates.map((template) => {
          // Подсчитываем количество сотрудников, использующих этот график
          const assignedEmployees = employeeSchedules.filter(
            (es: any) => es.schedule_id === template.id,
          );
          const employeeCount = assignedEmployees.length;

          return (
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
                      {employeeCount > 0 && (
                        <div className="text-xs mt-1 text-muted-foreground">
                          Используется {employeeCount} {employeeCount === 1 ? "сотрудником" : employeeCount < 5 ? "сотрудниками" : "сотрудниками"}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditTemplate(template)}
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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
                  {employeeCount > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">
                        Назначено сотрудникам:
                      </p>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {assignedEmployees.slice(0, 3).map((assignment) => (
                          <div key={`${assignment.employee_id}-${assignment.schedule_id}`} className="text-xs">
                            <span className="font-medium">{assignment.employee?.full_name}</span>
                            <span className="text-muted-foreground ml-1">
                              ({new Date(assignment.valid_from).toLocaleDateString("ru-RU")}
                              {assignment.valid_to && ` - ${new Date(assignment.valid_to).toLocaleDateString("ru-RU")}`})
                            </span>
                          </div>
                        ))}
                        {assignedEmployees.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            и еще {assignedEmployees.length - 3}...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
