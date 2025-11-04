import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Calendar, Clock, Trash2, Edit, X, Users } from "lucide-react";
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
  const [dateError, setDateError] = useState<string | null>(null);
  
  const validateDates = (start: string, end: string): string | null => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate < startDate) {
      return "Дата окончания должна быть после даты начала";
    }
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return "Диапазон дат не может превышать 365 дней";
    }
    
    return null;
  };
  
  const handleStartDateChange = (value: string): void => {
    setStartDate(value);
    setDateError(validateDates(value, endDate));
  };
  
  const handleEndDateChange = (value: string): void => {
    setEndDate(value);
    setDateError(validateDates(startDate, value));
  };

  const generateShiftsMutation = useMutation({
    mutationFn: async () => {
      // Валидация дат на клиенте
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        throw new Error("Дата окончания должна быть после даты начала");
      }
      
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        throw new Error("Диапазон дат не может превышать 365 дней");
      }
      
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
      setDateError(null);
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
      // Устанавливаем ошибку валидации, если это ошибка дат
      if (error.message.includes("дата") || error.message.includes("диапазон")) {
        setDateError(error.message);
      }
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
    <div className="flex flex-col gap-5" data-testid="page-schedules">
      <div className="flex gap-2">
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-white hover:bg-[#d15536] transition-colors"
              data-testid="button-generate-shifts"
            >
              <Calendar className="w-4 h-4" />
                Сгенерировать смены
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 [&>button]:hidden max-w-md">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                    Сгенерировать смены из графика
                </h3>
                <button
                  onClick={() => {
                    setIsGenerateOpen(false);
                    setDateError(null);
                  }}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">Период генерации</label>
                  <div className="grid grid-cols-2 gap-[10px]">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-[#959595] leading-[1.2]">Дата начала</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-[#959595] leading-[1.2]">Дата окончания</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className={`bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 ${dateError ? 'border border-red-500' : ''}`}
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-xs text-red-500 mt-1">{dateError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">Сотрудники (опционально)</label>
                  <p className="text-xs text-[#959595] leading-[1.2]">
                    Если не выбраны, смены будут созданы для всех сотрудников с назначенными графиками
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-[#f8f8f8] rounded-[12px] p-3 space-y-1">
                    {employeesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : employees.length === 0 ? (
                      <p className="text-xs text-[#959595] p-2">Нет сотрудников</p>
                    ) : (
                      employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#eeeeee] p-1 rounded px-2">
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
                          <span className="text-sm text-black">{emp.full_name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsGenerateOpen(false)}
                  className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                >
                    Отмена
                </button>
                <button
                  onClick={() => generateShiftsMutation.mutate()}
                  disabled={generateShiftsMutation.isPending || !startDate || !endDate || templates.length === 0 || !!dateError}
                  className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-confirm-generate"
                >
                  {generateShiftsMutation.isPending ? (
                    <>
                      <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Генерация...
                    </>
                  ) : (
                    "Сгенерировать"
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-[rgba(225,101,70,0.1)] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-[#e16546] hover:bg-[rgba(225,101,70,0.15)] transition-colors"
              onClick={() => {
                setBulkSelectedEmployees([]);
                setBulkScheduleId("");
                setIsBulkAssignOpen(true);
              }}
              data-testid="button-bulk-assign-schedule"
            >
              <Calendar className="w-4 h-4" />
                Массовое назначение
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 [&>button]:hidden max-w-md">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                    Массовое назначение графика
                </h3>
                <button
                  onClick={() => setIsBulkAssignOpen(false)}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">График</label>
                  <Select value={bulkScheduleId} onValueChange={setBulkScheduleId}>
                    <SelectTrigger className="bg-[#f8f8f8] border-0 rounded-[12px]">
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
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">Дата начала</label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    id="bulk-valid-from"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">Дата окончания (необязательно)</label>
                  <input
                    type="date"
                    className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    id="bulk-valid-to"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-black leading-[1.2]">Сотрудники</label>
                  <div className="max-h-60 overflow-y-auto bg-[#f8f8f8] rounded-[12px] p-3 space-y-1">
                    {employeesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : employees.length === 0 ? (
                      <p className="text-xs text-[#959595] p-2">Нет сотрудников</p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-[#eeeeee] p-1 rounded px-2">
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
                          <span className="text-sm font-medium text-black">Выбрать всех</span>
                        </label>
                        <div className="border-t border-[#eeeeee] pt-1 mt-1" />
                        {employees.map(emp => (
                          <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#eeeeee] p-1 rounded px-2">
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
                            <span className="text-sm text-black">{emp.full_name}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkAssignOpen(false)}
                  className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                >
                    Отмена
                </button>
                <button
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
                  className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkAssignScheduleMutation.isPending ? (
                    <>
                      <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Назначение...
                    </>
                  ) : (
                    `Назначить (${bulkSelectedEmployees.length})`
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-[rgba(225,101,70,0.1)] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-[#e16546] hover:bg-[rgba(225,101,70,0.15)] transition-colors"
              data-testid="button-assign-schedule"
            >
              <Calendar className="w-4 h-4" />
                Назначить график
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 [&>button]:hidden">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                    Назначить график сотруднику
                </h3>
                <button
                  onClick={() => setIsAssignOpen(false)}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <Form {...assignForm}>
                <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="flex flex-col gap-5">
                  <FormField
                    control={assignForm.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Сотрудник</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#f8f8f8] border-0 rounded-[12px] h-auto px-[14px] py-3" data-testid="select-employee">
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
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">График</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#f8f8f8] border-0 rounded-[12px] h-auto px-[14px] py-3" data-testid="select-schedule">
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
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Дата начала</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                            data-testid="input-valid-from" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="valid_to"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Дата окончания (необязательно)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                            data-testid="input-valid-to" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAssignOpen(false)}
                      className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={assignScheduleMutation.isPending}
                      className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-submit-assign"
                    >
                      {assignScheduleMutation.isPending ? (
                        <>
                          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                            Назначение...
                        </>
                      ) : (
                        "Назначить"
                      )}
                    </button>
                  </div>
                </form>
              </Form>
            </div>
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
            <button
              onClick={() => {
                handleCreateTemplate(); 
              }}
              className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-white hover:bg-[#d15536] transition-colors"
              data-testid="button-create-template"
            >
              <Plus className="w-4 h-4" />
                Создать график
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 [&>button]:hidden">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  {editingTemplate ? "Редактировать шаблон графика" : "Создать шаблон графика"}
                </h3>
                <button
                  onClick={() => {
                    setIsTemplateOpen(false);
                    setEditingTemplate(null);
                    templateForm.reset();
                    setSelectedWorkdays([1, 2, 3, 4, 5]);
                  }}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="flex flex-col gap-5">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Название</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Стандартный график" 
                            {...field} 
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                            data-testid="input-template-name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-[10px]">
                    <FormField
                      control={templateForm.control}
                      name="shift_start"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1">
                          <FormLabel className="text-sm font-medium text-black leading-[1.2]">Начало смены</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                              data-testid="input-shift-start" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="shift_end"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1">
                          <FormLabel className="text-sm font-medium text-black leading-[1.2]">Конец смены</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                              data-testid="input-shift-end" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <FormLabel className="text-sm font-medium text-black leading-[1.2]">Рабочие дни</FormLabel>
                    <div className="flex gap-1.5">
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWorkday(day.value)}
                          className={`px-[14px] py-[7px] rounded-lg text-sm leading-[1.2] transition-colors ${
                            selectedWorkdays.includes(day.value)
                              ? "bg-[#e16546] text-white"
                              : "bg-[#f8f8f8] text-black"
                          }`}
                          data-testid={`workday-${day.value}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTemplateOpen(false);
                        setEditingTemplate(null);
                        templateForm.reset();
                        setSelectedWorkdays([1, 2, 3, 4, 5]);
                      }}
                      className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-submit-template"
                    >
                      {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                        <>
                          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                        </>
                      ) : (
                        editingTemplate ? "Сохранить" : "Создать"
                      )}
                    </button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          // Подсчитываем количество сотрудников, использующих этот график
          const assignedEmployees = employeeSchedules.filter(
            (es: any) => es.schedule_id === template.id,
          );
          const employeeCount = assignedEmployees.length;

          return (
            <div
              key={template.id}
              className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4"
              data-testid={`template-card-${template.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-black truncate">{template.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-[#565656]" />
                    <span className="text-sm text-[#565656]">
                      {template.rules.shift_start} - {template.rules.shift_end}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="bg-[#e16546] rounded-[20px] size-8 flex items-center justify-center hover:bg-[#d15536] transition-colors"
                    data-testid={`button-edit-${template.id}`}
                    aria-label="Редактировать"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                    disabled={deleteTemplateMutation.isPending}
                    className="bg-white rounded-[20px] size-8 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                    data-testid={`button-delete-${template.id}`}
                    aria-label="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#565656]">Рабочие дни:</p>
                <div className="flex flex-wrap gap-1.5">
                  {template.rules.workdays.sort((a, b) => a - b).map(day => {
                    const dayLabel = weekDays.find(d => d.value === day)?.label || day;
                    return (
                      <div
                        key={day}
                        className="bg-[#e16546] px-[14px] py-[7px] rounded-lg text-sm text-white leading-[1.2]"
                      >
                        {dayLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-[#eeeeee]">
                <Users className="w-3.5 h-3.5 text-[#565656]" />
                <span className="text-xs text-[#565656]">
                  {employeeCount > 0 
                    ? `Используется ${employeeCount} ${employeeCount === 1 ? 'сотрудником' : employeeCount < 5 ? 'сотрудниками' : 'сотрудниками'}`
                    : 'Не назначен'}
                </span>
              </div>
            </div>
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
