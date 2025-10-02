import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Building2, Globe, Clock } from "lucide-react";
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

const companyFormSchema = z.object({
  name: z.string().min(1, "Введите название компании"),
  tz: z.string().min(1, "Выберите часовой пояс"),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompanySettings() {
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['/api/companies', companyId],
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
    </div>
  );
}
