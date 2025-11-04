import { useState } from "react";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Loader2, Bell, Globe, Building2, AlertTriangle, Plus, Edit, Trash2, X, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SettingsSkeleton } from "@/components/LoadingSkeletons";
import { ErrorState } from "@/components/ErrorBoundary";
import { useRetry } from "@/hooks/useRetry";
import { getContextErrorMessage } from "@/lib/errorMessages";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface UserSettings {
  notifications: boolean;
  language: string;
  emailNotifications: boolean;
  desktopNotifications: boolean;
}

type Company = {
  id: string;
  name: string;
  tz: string;
  settings: Record<string, unknown>;
};

type ViolationRule = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  penalty_percent: number;
  auto_detectable: boolean;
  is_active: boolean;
  created_at: string;
};

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

type ScheduleEmployee = {
  id: string;
  full_name: string;
  position: string;
  status: string;
};

// Schemas
const companyFormSchema = z.object({
  name: z.string().min(1, "Введите название компании"),
  tz: z.string().min(1, "Выберите часовой пояс"),
});

const violationRuleSchema = z.object({
  code: z.string().min(1, "Введите код нарушения"),
  name: z.string().min(1, "Введите название нарушения"),
  penalty_percent: z.number().min(1, "Штраф должен быть больше 0").max(100, "Штраф не может быть больше 100%"),
  auto_detectable: z.boolean(),
  is_active: z.boolean(),
});

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

type CompanyFormValues = z.infer<typeof companyFormSchema>;
type ViolationRuleFormValues = z.infer<typeof violationRuleSchema>;
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

// LocalStorage helpers
const SETTINGS_KEY = "user-settings";

function getStoredSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return {
    notifications: true,
    language: "ru",
    emailNotifications: true,
    desktopNotifications: false,
  };
}

function saveSettings(settings: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

export default function Settings() {
  const { user, companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // User settings state
  const [userSettings, setUserSettings] = useState<UserSettings>(getStoredSettings());
  const [hasChanges, setHasChanges] = useState(false);
  
  // Violation modal state
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ViolationRule | null>(null);

  // Schedules state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const [selectedWorkdays, setSelectedWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState<string[]>([]);
  const [bulkScheduleId, setBulkScheduleId] = useState("");
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

  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  // Fetch violation rules
  const { data: violationRules = [], isLoading: rulesLoading } = useQuery<ViolationRule[]>({
    queryKey: ["/api/companies", companyId, "violation-rules"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${companyId}/violation-rules`);
      return response.json();
    },
    enabled: !!companyId,
  });

  // Fetch schedules data
  const { data: templates = [], isLoading: templatesLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: ["/api/companies", companyId, "schedule-templates"],
    enabled: !!companyId,
  });

  const { data: scheduleEmployees = [], isLoading: employeesLoading } = useQuery<ScheduleEmployee[]>({
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

  // User settings handlers
  const updateUserSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setUserSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveUserSettings = () => {
    saveSettings(userSettings);
    setHasChanges(false);
    toast({
      title: "Настройки сохранены",
      description: "Ваши настройки успешно обновлены",
    });
  };

  // Company form
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    values: {
      name: company?.name || "",
      tz: company?.tz || "Europe/Moscow",
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      const response = await apiRequest("PUT", `/api/companies/${companyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Настройки сохранены", description: "Настройки компании успешно обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить настройки", variant: "destructive" });
    },
  });

  // Violation form
  const violationForm = useForm<ViolationRuleFormValues>({
    resolver: zodResolver(violationRuleSchema),
    defaultValues: {
      code: "",
      name: "",
      penalty_percent: 5,
      auto_detectable: false,
      is_active: true,
    },
  });

  const createViolationRuleMutation = useMutation({
    mutationFn: async (data: ViolationRuleFormValues) => {
      if (!companyId) {
        throw new Error("Не определена компания");
      }
      const response = await apiRequest("POST", "/api/violation-rules", { 
        ...data, 
        penalty_percent: String(data.penalty_percent),
        company_id: companyId, 
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось создать правило");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "violation-rules"] });
      toast({ title: "Правило создано", description: "Новое правило нарушения успешно добавлено" });
      setIsViolationModalOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err?.message || "Не удалось создать правило нарушения", variant: "destructive" });
    },
  });

  const updateViolationRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ViolationRuleFormValues }) => {
      const response = await apiRequest("PUT", `/api/violation-rules/${id}`, {
        ...data,
        penalty_percent: String(data.penalty_percent),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось обновить правило");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "violation-rules"] });
      toast({ title: "Правило обновлено", description: "Правило нарушения успешно обновлено" });
      setIsViolationModalOpen(false);
      setEditingRule(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err?.message || "Не удалось обновить правило нарушения", variant: "destructive" });
    },
  });

  const deleteViolationRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/violation-rules/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось удалить правило");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "violation-rules"] });
      toast({ title: "Правило удалено", description: "Правило нарушения успешно удалено" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err?.message || "Не удалось удалить правило нарушения", variant: "destructive" });
    },
  });

  // Handlers
  const onCompanySubmit = (data: CompanyFormValues) => {
    updateCompanyMutation.mutate(data);
  };

  const onViolationSubmit = (data: ViolationRuleFormValues) => {
    const normalized = data.code.trim().toLowerCase();
    const exists = violationRules.some((r) => {
      if (editingRule && r.id === editingRule.id) {
        return false;
      }
      return r.code.trim().toLowerCase() === normalized;
    });
    if (exists) {
      violationForm.setError("code", { type: "manual", message: "Код уже используется" });
      toast({ title: "Ошибка", description: "Код правила должен быть уникальным", variant: "destructive" });
      return;
    }
    if (editingRule) {
      updateViolationRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createViolationRuleMutation.mutate(data);
    }
  };

  const handleEditRule = (rule: ViolationRule) => {
    setEditingRule(rule);
    violationForm.reset({
      code: rule.code,
      name: rule.name,
      penalty_percent: rule.penalty_percent,
      auto_detectable: rule.auto_detectable,
      is_active: rule.is_active,
    });
    setIsViolationModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить это правило?")) {
      deleteViolationRuleMutation.mutate(id);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    violationForm.reset({
      code: "",
      name: "",
      penalty_percent: 5,
      auto_detectable: false,
      is_active: true,
    });
    setIsViolationModalOpen(true);
  };

  // Schedule forms
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      shift_start: "09:00",
      shift_end: "18:00",
      workdays: [1, 2, 3, 4, 5],
    },
  });

  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      employee_id: "",
      schedule_id: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: "",
    },
  });

  // Schedule mutations
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
      toast({ title: "График создан", description: "Шаблон графика успешно создан" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать график", variant: "destructive" });
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
      toast({ title: "График обновлен", description: "Шаблон графика успешно обновлен" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить график", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/schedule-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "schedule-templates"] });
      toast({ title: "График удален", description: "Шаблон графика успешно удален" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить график", variant: "destructive" });
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
      toast({ title: "График назначен", description: "График успешно назначен сотруднику" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось назначить график", variant: "destructive" });
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
      toast({ title: "Графики назначены", description: `График успешно назначен ${variables.employeeIds.length} сотрудник(ам)` });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось назначить графики", variant: "destructive" });
    },
  });

  const generateShiftsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/generate-shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      toast({ title: "Смены сгенерированы", description: message ?? `Создано ${data.shifts?.length ?? 0} смен` });
      void queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "shifts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось сгенерировать смены", variant: "destructive" });
    },
  });

  // Schedule handlers
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

  // Retry hooks
  const companyRetry = useRetry(["/api/companies", companyId]);
  const rulesRetry = useRetry(["/api/companies", companyId, "violation-rules"]);

  // Loading state
  if (authLoading || companyLoading) {
    return <SettingsSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="page-settings">
      <Tabs defaultValue="general" className="flex flex-col gap-5">
        <TabsList className="bg-[#f8f8f8] rounded-[20px] p-1 grid w-full grid-cols-4 h-auto">
          <TabsTrigger 
            value="general" 
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Общие
          </TabsTrigger>
          <TabsTrigger 
            value="schedules"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Графики
          </TabsTrigger>
          <TabsTrigger 
            value="violations"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Нарушения
          </TabsTrigger>
          <TabsTrigger 
            value="notifications"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Уведомления
          </TabsTrigger>
        </TabsList>

        {/* General Tab (Profile + Company) */}
        <TabsContent value="general" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="size-[50px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Профиль пользователя</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-3 border-t border-[#eeeeee]">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#959595] leading-[1.2]">Email</label>
                <p className="text-sm text-black leading-[1.2]">{user.email}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#959595] leading-[1.2]">User ID</label>
                <p className="text-xs text-[#565656] font-mono leading-[1.2]">{user.id}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Язык интерфейса</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Выберите язык приложения</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium text-black leading-[1.2]">Язык</Label>
                <Select 
                  value={userSettings.language} 
                  onValueChange={(value) => updateUserSetting("language", value)}
                >
                  <SelectTrigger className="bg-white border-0 rounded-[12px] h-auto px-[14px] py-3" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#959595] leading-[1.2]">
                  {userSettings.language === "en" && "English translation will be available in the next version"}
                  {userSettings.language === "ru" && "Перевод на английский будет доступен в следующей версии"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Основная информация</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Название и базовые настройки компании</p>
              </div>
            </div>
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="flex flex-col gap-4">
                <FormField
                  control={companyForm.control}
                  name="name"
                  render={({ field }: any) => (
                    <FormItem className="flex flex-col gap-1">
                      <FormLabel className="text-sm font-medium text-black leading-[1.2]">Название компании</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ООО Ромашка" 
                          {...field} 
                          className="bg-white border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                          data-testid="input-company-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  
                <FormField
                  control={companyForm.control}
                  name="tz"
                  render={({ field }: any) => (
                    <FormItem className="flex flex-col gap-1">
                      <FormLabel className="text-sm font-medium text-black leading-[1.2]">Часовой пояс компании</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-0 rounded-[12px] h-auto px-[14px] py-3" data-testid="select-company-timezone">
                            <SelectValue placeholder="Выберите часовой пояс" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                          <SelectItem value="Europe/Samara">Самара (UTC+4)</SelectItem>
                          <SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem>
                          <SelectItem value="Asia/Novosibirsk">Новосибирск (UTC+7)</SelectItem>
                          <SelectItem value="Asia/Vladivostok">Владивосток (UTC+10)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-1 pt-3 border-t border-[#eeeeee]">
                  <Label className="text-sm text-[#959595] leading-[1.2]">ID компании</Label>
                  <p className="text-sm text-[#565656] font-mono leading-[1.2]">{company?.id}</p>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => companyForm.reset()}
                    className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                  >
                      Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={updateCompanyMutation.isPending}
                    className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-save-company"
                  >
                    {updateCompanyMutation.isPending ? (
                      <>
                        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      "Сохранить изменения"
                    )}
                  </button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="flex flex-col gap-4">
          {authLoading || templatesLoading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
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
                          onClick={() => setIsGenerateOpen(false)}
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
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-sm text-[#959595] leading-[1.2]">Дата окончания</label>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                              />
                            </div>
                          </div>
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
                            ) : scheduleEmployees.length === 0 ? (
                              <p className="text-xs text-[#959595] p-2">Нет сотрудников</p>
                            ) : (
                              scheduleEmployees.map(emp => (
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
                          disabled={generateShiftsMutation.isPending || !startDate || !endDate || templates.length === 0}
                          className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            ) : scheduleEmployees.length === 0 ? (
                              <p className="text-xs text-[#959595] p-2">Нет сотрудников</p>
                            ) : (
                              <>
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#eeeeee] p-1 rounded px-2">
                                  <input
                                    type="checkbox"
                                    checked={bulkSelectedEmployees.length === scheduleEmployees.length && scheduleEmployees.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setBulkSelectedEmployees(scheduleEmployees.map(emp => emp.id));
                                      } else {
                                        setBulkSelectedEmployees([]);
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-sm font-medium text-black">Выбрать всех</span>
                                </label>
                                <div className="border-t border-[#eeeeee] pt-1 mt-1" />
                                {scheduleEmployees.map(emp => (
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
                            const validFromInput = document.getElementById("bulk-valid-from") as HTMLInputElement;
                            const validToInput = document.getElementById("bulk-valid-to") as HTMLInputElement;
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
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Form {...assignForm}>
                        <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="flex flex-col gap-5">
                          <FormField
                            control={assignForm.control}
                            name="employee_id"
                            render={({ field }: any) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-sm font-medium text-black leading-[1.2]">Сотрудник</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-[#f8f8f8] border-0 rounded-[12px] h-auto px-[14px] py-3">
                                      <SelectValue placeholder="Выберите сотрудника" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {scheduleEmployees.map(emp => (
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
                            render={({ field }: any) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-sm font-medium text-black leading-[1.2]">График</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-[#f8f8f8] border-0 rounded-[12px] h-auto px-[14px] py-3">
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
                            render={({ field }: any) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-sm font-medium text-black leading-[1.2]">Дата начала</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={assignForm.control}
                            name="valid_to"
                            render={({ field }: any) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-sm font-medium text-black leading-[1.2]">Дата окончания (необязательно)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
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
                      onClick={() => handleCreateTemplate()}
                      className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-1.5 text-sm font-medium text-white hover:bg-[#d15536] transition-colors"
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
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Form {...templateForm}>
                        <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="flex flex-col gap-5">
                          <FormField
                            control={templateForm.control}
                            name="name"
                            render={({ field }: any) => (
                              <FormItem className="flex flex-col gap-1">
                                <FormLabel className="text-sm font-medium text-black leading-[1.2]">Название</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Стандартный график" 
                                    {...field} 
                                    className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
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
                              render={({ field }: any) => (
                                <FormItem className="flex flex-col gap-1">
                                  <FormLabel className="text-sm font-medium text-black leading-[1.2]">Начало смены</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="time" 
                                      {...field} 
                                      className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={templateForm.control}
                              name="shift_end"
                              render={({ field }: any) => (
                                <FormItem className="flex flex-col gap-1">
                                  <FormLabel className="text-sm font-medium text-black leading-[1.2]">Конец смены</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="time" 
                                      {...field} 
                                      className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
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
                {templates.map((template) => {
                  const assignedEmployees = employeeSchedules.filter(
                    (es: any) => es.schedule_id === template.id,
                  );
                  const employeeCount = assignedEmployees.length;

                  return (
                    <div
                      key={template.id}
                      className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4"
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
                            aria-label="Редактировать"
                          >
                            <Edit className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                            className="bg-white rounded-[20px] size-8 flex items-center justify-center hover:bg-neutral-100 transition-colors"
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
                    </div>
                  );
                })}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#565656]">Графики не найдены</p>
                  <p className="text-sm text-[#959595] mt-2">Создайте первый график работы</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#e16546]" />
                <div>
                  <h3 className="text-base font-semibold text-black leading-[1.2]">Правила нарушений</h3>
                  <p className="text-sm text-[#959595] leading-[1.2]">Настройка штрафов за нарушения дисциплины</p>
                </div>
              </div>
              <button 
                onClick={handleAddRule} 
                disabled={rulesLoading}
                className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                  Добавить правило
              </button>
            </div>
            <div>
              {rulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : violationRules.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-10 h-10 text-[#959595] mx-auto mb-3" />
                  <div className="text-lg font-semibold text-black mb-1">Правила нарушений не настроены</div>
                  <div className="text-sm text-[#565656] mb-4">Добавьте первые правила, чтобы система могла снижать рейтинг сотрудников</div>
                  <button 
                    onClick={handleAddRule}
                    className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить правило
                  </button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Нарушение</TableHead>
                      <TableHead>Автоопределение</TableHead>
                      <TableHead>Штраф (%)</TableHead>
                      <TableHead className="whitespace-nowrap">Активно</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violationRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-black">{rule.name}</div>
                            <div className="text-sm text-[#959595]">{rule.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`px-[10px] py-1 rounded-[20px] text-xs font-medium inline-block ${
                            rule.auto_detectable 
                              ? "bg-[rgba(52,199,89,0.08)] text-[#34c759]" 
                              : "bg-[#f8f8f8] text-[#565656]"
                          }`}>
                            {rule.auto_detectable ? "✅ Да" : "❌ Нет"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="bg-white px-[10px] py-1 rounded-[20px] text-xs text-[#565656] inline-block border border-[#eeeeee]">
                            {rule.penalty_percent}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) =>
                                updateViolationRuleMutation.mutate({
                                  id: rule.id,
                                  data: {
                                    code: rule.code,
                                    name: rule.name,
                                    penalty_percent: rule.penalty_percent,
                                    auto_detectable: rule.auto_detectable,
                                    is_active: checked,
                                  },
                                })
                              }
                            />
                            <span className="text-sm text-[#565656]">
                              {rule.is_active ? "Включено" : "Выключено"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleEditRule(rule)}
                              className="bg-[#e16546] rounded-[20px] size-8 flex items-center justify-center hover:bg-[#d15536] transition-colors"
                              aria-label="Редактировать"
                            >
                              <Edit className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRule(rule.id)}
                              className="bg-white rounded-[20px] size-8 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Уведомления</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Настройка оповещений</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium text-black leading-[1.2]">Уведомления о событиях</Label>
                  <p className="text-sm text-[#959595] leading-[1.2]">
                    Получать уведомления о новых событиях
                  </p>
                </div>
                <Switch
                  checked={userSettings.notifications}
                  onCheckedChange={(checked) => updateUserSetting("notifications", checked)}
                  data-testid="switch-notifications"
                />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#eeeeee]">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium text-black leading-[1.2]">Email уведомления</Label>
                  <p className="text-sm text-[#959595] leading-[1.2]">
                    Получать уведомления на почту
                  </p>
                </div>
                <Switch
                  checked={userSettings.emailNotifications}
                  onCheckedChange={(checked) => updateUserSetting("emailNotifications", checked)}
                  data-testid="switch-email-notifications"
                />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#eeeeee]">
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium text-black leading-[1.2]">Desktop уведомления</Label>
                  <p className="text-sm text-[#959595] leading-[1.2]">
                    Показывать уведомления на рабочем столе
                  </p>
                </div>
                <Switch
                  checked={userSettings.desktopNotifications}
                  onCheckedChange={(checked) => updateUserSetting("desktopNotifications", checked)}
                  data-testid="switch-desktop-notifications"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => {
                setUserSettings(getStoredSettings());
                setHasChanges(false);
              }}
              disabled={!hasChanges}
              className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button 
              onClick={handleSaveUserSettings} 
              data-testid="button-save-settings"
              disabled={!hasChanges}
              className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Сохранить изменения
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Violation Modal */}
      {isViolationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setIsViolationModalOpen(false);
          setEditingRule(null);
        }}>
          <div 
            className="bg-white rounded-[20px] p-5 w-full max-w-md mx-4 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)]" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  {editingRule ? "Редактировать правило" : "Добавить правило нарушения"}
                </h3>
                <button
                  onClick={() => {
                    setIsViolationModalOpen(false);
                    setEditingRule(null);
                  }}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <Form {...violationForm}>
                <form onSubmit={violationForm.handleSubmit(onViolationSubmit)} className="flex flex-col gap-5">
                  <FormField
                    control={violationForm.control}
                    name="code"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Код нарушения</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="late" 
                            {...field} 
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={violationForm.control}
                    name="name"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Название нарушения</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Опоздание" 
                            {...field} 
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={violationForm.control}
                    name="penalty_percent"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-medium text-black leading-[1.2]">Штраф (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="bg-[#f8f8f8] border-0 rounded-[12px] px-[14px] py-3 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={violationForm.control}
                    name="auto_detectable"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-row items-center justify-between bg-[#f8f8f8] rounded-[12px] p-3">
                        <div className="flex flex-col gap-0.5">
                          <FormLabel className="text-sm font-medium text-black leading-[1.2]">Автоматическое определение</FormLabel>
                          <div className="text-sm text-[#959595] leading-[1.2]">
                          Может ли система определить нарушение автоматически
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={violationForm.control}
                    name="is_active"
                    render={({ field }: any) => (
                      <FormItem className="flex flex-row items-center justify-between bg-[#f8f8f8] rounded-[12px] p-3">
                        <div className="flex flex-col gap-0.5">
                          <FormLabel className="text-sm font-medium text-black leading-[1.2]">Активно</FormLabel>
                          <div className="text-sm text-[#959595] leading-[1.2]">
                          Правило активно и применяется к сотрудникам
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsViolationModalOpen(false);
                        setEditingRule(null);
                      }}
                      className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                    >
                    Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={createViolationRuleMutation.isPending || updateViolationRuleMutation.isPending}
                      className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(createViolationRuleMutation.isPending || updateViolationRuleMutation.isPending) ? (
                        <>
                          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        editingRule ? "Сохранить" : "Добавить"
                      )}
                    </button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
