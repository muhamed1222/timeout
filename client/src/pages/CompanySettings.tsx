import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building2, Globe, Clock, AlertTriangle, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

type CompanyFormValues = z.infer<typeof companyFormSchema>;
type ViolationRuleFormValues = z.infer<typeof violationRuleSchema>;

export default function CompanySettings() {
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ViolationRule | null>(null);

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['/api/companies', companyId],
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

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      const response = await apiRequest('PUT', `/api/companies/${companyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId] });
      toast({
        title: "Настройки сохранены",
        description: "Настройки компании успешно обновлены"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить настройки",
        variant: "destructive"
      });
    }
  });

  const createViolationRuleMutation = useMutation({
    mutationFn: async (data: ViolationRuleFormValues) => {
      if (!companyId) throw new Error('Не определена компания');
      const response = await apiRequest('POST', `/api/violation-rules`, { ...data, company_id: companyId });
      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error || 'Не удалось создать правило';
        throw new Error(message);
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'violation-rules'] });
      toast({
        title: "Правило создано",
        description: "Новое правило нарушения успешно добавлено"
      });
      setIsViolationModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать правило нарушения",
        variant: "destructive"
      });
    }
  });

  const updateViolationRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ViolationRuleFormValues }) => {
      const response = await apiRequest('PUT', `/api/violation-rules/${id}`, data);
      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error || 'Не удалось обновить правило';
        throw new Error(message);
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'violation-rules'] });
      toast({
        title: "Правило обновлено",
        description: "Правило нарушения успешно обновлено"
      });
      setIsViolationModalOpen(false);
      setEditingRule(null);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить правило нарушения",
        variant: "destructive"
      });
    }
  });

  const deleteViolationRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/violation-rules/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error || 'Не удалось удалить правило';
        throw new Error(message);
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'violation-rules'] });
      toast({
        title: "Правило удалено",
        description: "Правило нарушения успешно удалено"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить правило нарушения",
        variant: "destructive"
      });
    }
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    values: {
      name: company?.name || "",
      tz: company?.tz || "Europe/Moscow"
    }
  });

  const onSubmit = (data: CompanyFormValues) => {
    updateCompanyMutation.mutate(data);
  };

  const violationForm = useForm<ViolationRuleFormValues>({
    resolver: zodResolver(violationRuleSchema),
    defaultValues: {
      code: "",
      name: "",
      penalty_percent: 5,
      auto_detectable: false,
      is_active: true,
    }
  });

  const onViolationSubmit = (data: ViolationRuleFormValues) => {
    // Проверка уникальности кода (без учета регистра)
    const normalized = data.code.trim().toLowerCase();
    const exists = violationRules.some((r) => {
      if (editingRule && r.id === editingRule.id) return false;
      return r.code.trim().toLowerCase() === normalized;
    });
    if (exists) {
      violationForm.setError('code', { type: 'manual', message: 'Код уже используется' });
      toast({ title: 'Ошибка', description: 'Код правила должен быть уникальным', variant: 'destructive' });
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!companyId || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="page-company-settings">
      <div>
        <h1 className="text-3xl font-bold">Настройки компании</h1>
        <p className="text-muted-foreground">Управление параметрами организации</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Основные</TabsTrigger>
          <TabsTrigger value="violations">Нарушения</TabsTrigger>
          <TabsTrigger value="info">Информация</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <div>
                  <CardTitle>Основная информация</CardTitle>
                  <CardDescription>Название и базовые настройки компании</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название компании</FormLabel>
                        <FormControl>
                          <Input placeholder="ООО Ромашка" {...field} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tz"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Часовой пояс компании</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company-timezone">
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

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                    >
                      Отмена
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateCompanyMutation.isPending}
                      data-testid="button-save-company"
                    >
                      {updateCompanyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Сохранить изменения
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <CardTitle>Правила нарушений</CardTitle>
                    <CardDescription>Настройка штрафов за нарушения дисциплины</CardDescription>
                  </div>
                </div>
                <Button onClick={handleAddRule} size="sm" disabled={rulesLoading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить правило
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : violationRules.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <div className="text-lg font-semibold mb-1">Правила нарушений не настроены</div>
                  <div className="text-sm text-muted-foreground mb-4">Добавьте первые правила, чтобы система могла снижать рейтинг сотрудников</div>
                  <Button onClick={handleAddRule} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить правило
                  </Button>
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
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground">{rule.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.auto_detectable ? "default" : "secondary"}>
                            {rule.auto_detectable ? "✅ Да" : "❌ Нет"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.penalty_percent}%</Badge>
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
                              aria-label="Переключить активность правила"
                            />
                            <span className="text-sm text-muted-foreground">
                              {rule.is_active ? 'Включено' : 'Выключено'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <div>
                  <CardTitle>Рабочие параметры</CardTitle>
                  <CardDescription>Настройки для отслеживания рабочего времени</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ID компании</Label>
                <p className="text-sm text-muted-foreground font-mono">{company.id}</p>
              </div>
              <div className="space-y-2">
                <Label>Текущий часовой пояс</Label>
                <p className="text-sm text-muted-foreground">{company.tz}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Модальное окно для правил нарушений */}
      {isViolationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingRule ? "Редактировать правило" : "Добавить правило нарушения"}
            </h3>
            <Form {...violationForm}>
              <form onSubmit={violationForm.handleSubmit(onViolationSubmit)} className="space-y-4">
                <FormField
                  control={violationForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Код нарушения</FormLabel>
                      <FormControl>
                        <Input placeholder="late" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={violationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название нарушения</FormLabel>
                      <FormControl>
                        <Input placeholder="Опоздание" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={violationForm.control}
                  name="penalty_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Штраф (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="100" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={violationForm.control}
                  name="auto_detectable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Автоматическое определение</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Может ли система определить нарушение автоматически
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={violationForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Активно</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Правило активно и применяется к сотрудникам
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsViolationModalOpen(false);
                      setEditingRule(null);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={createViolationRuleMutation.isPending || updateViolationRuleMutation.isPending}
                  >
                    {(createViolationRuleMutation.isPending || updateViolationRuleMutation.isPending) && 
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingRule ? "Сохранить" : "Добавить"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
