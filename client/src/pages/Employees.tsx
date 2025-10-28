import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Loader2, QrCode, Copy, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string;
};

type EmployeeInvite = {
  id: string;
  code: string;
  full_name: string;
  position: string;
  used_at: string | null;
  used_by_employee_id: string | null;
  created_at: string;
};

type InviteLink = {
  code: string;
  deep_link: string;
  qr_code_url: string;
};

const inviteFormSchema = z.object({
  full_name: z.string().min(1, "Введите имя сотрудника"),
  position: z.string().min(1, "Введите должность"),
  tz: z.string().default("Europe/Moscow")
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<InviteLink | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();

  const handleAddEmployee = () => {
    setShowAddEmployeeModal(true);
  };

  // Мутация для удаления приглашения
  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest('DELETE', `/api/employee-invites/${inviteId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Приглашение удалено",
        description: "Приглашение успешно удалено",
      });
      refetchInvites();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить приглашение",
        variant: "destructive",
      });
    },
  });

  const handleDeleteInvite = (inviteId: string) => {
    deleteInviteMutation.mutate(inviteId);
  };

  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/companies', companyId, 'employees'],
    enabled: !!companyId,
    // Регулярно обновляем список сотрудников, чтобы отобразить тех, кто подключился через Telegram
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: invites = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery<EmployeeInvite[]>({
    queryKey: ['/api/companies', companyId, 'employee-invites'],
    enabled: !!companyId,
    // После использования инвайта через Telegram быстро подтягиваем изменения
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues): Promise<EmployeeInvite> => {
      const response = await apiRequest('POST', `/api/employee-invites`, { ...data, company_id: companyId });
      return response.json();
    },
    onSuccess: (data: EmployeeInvite) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'employee-invites'] });
      form.reset();
      fetchInviteLink(data.code);
      toast({
        title: "Приглашение создано",
        description: "Инвайт-код успешно создан"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать приглашение",
        variant: "destructive"
      });
    }
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      full_name: "",
      position: "",
      tz: "Europe/Moscow"
    }
  });

  const fetchInviteLink = async (code: string) => {
    try {
      const response = await apiRequest('GET', `/api/employee-invites/${code}/link`);
      const data = await response.json();
      setSelectedInvite(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось получить ссылку-приглашение",
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: InviteFormValues) => {
    createInviteMutation.mutate(data);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({
      title: "Скопировано",
      description: "Инвайт-код скопирован в буфер обмена"
    });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Скопировано",
      description: "Ссылка скопирована в буфер обмена"
    });
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     emp.position.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedStatus === null || emp.status === selectedStatus)
  );

  const activeInvites = invites.filter(inv => !inv.used_at);

  if (authLoading || employeesLoading) {
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
    <div className="space-y-6" data-testid="page-employees">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">Управление командой</p>
        </div>
        <Button onClick={handleAddEmployee} data-testid="button-add-employee">
          <Plus className="w-4 h-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Поиск сотрудников..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-employees"
        />
      </div>

      <div className="flex gap-2">
        <Badge
          variant={selectedStatus === null ? "default" : "outline"}
          className="cursor-pointer hover-elevate"
          onClick={() => setSelectedStatus(null)}
          data-testid="filter-all-employees"
        >
          Все ({employees.length})
        </Badge>
        <Badge
          variant={selectedStatus === 'active' ? "default" : "outline"}
          className="cursor-pointer hover-elevate"
          onClick={() => setSelectedStatus('active')}
          data-testid="filter-active-employees"
        >
          Активные ({employees.filter(e => e.status === 'active').length})
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover-elevate" data-testid={`employee-card-${employee.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{employee.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{employee.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                </div>
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                  {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Часовой пояс:</span>
                  <span>{employee.tz}</span>
                </div>
                {employee.telegram_user_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telegram ID:</span>
                    <span className="font-mono text-xs">{employee.telegram_user_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeInvites.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Активные приглашения</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeInvites.map((invite) => (
              <Card key={invite.id} className="hover-elevate" data-testid={`invite-card-${invite.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{invite.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{invite.position}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono">
                      {invite.code}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopyCode(invite.code)}
                      data-testid={`button-copy-invite-${invite.id}`}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDeleteInvite(invite.id)}
                      data-testid={`button-delete-invite-${invite.id}`}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fetchInviteLink(invite.code)}
                    data-testid={`button-show-qr-${invite.id}`}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Показать QR-код
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Сотрудники не найдены</p>
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal 
        open={showAddEmployeeModal}
        onOpenChange={setShowAddEmployeeModal}
        onSuccess={() => {
          refetchEmployees();
          refetchInvites();
        }}
      />
    </div>
  );
}
