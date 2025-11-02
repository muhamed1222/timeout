import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Loader2, QrCode, Copy, Check, Trash2, Phone, Mail, Edit, Trash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, queryConfig } from "@/lib/queryClient";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";
import { EmployeeProfileModal } from "@/components/EmployeeProfileModal";
import { ErrorState } from "@/components/ErrorBoundary";
import { EmployeeListSkeleton } from "@/components/LoadingSkeletons";
import { useRetry } from "@/hooks/useRetry";
import { getContextErrorMessage } from "@/lib/errorMessages";
import { useSearchShortcut } from "@/hooks/useKeyboardShortcuts";
import { useRef } from "react";
import { useOptimisticDeleteInvite, useOptimisticDeleteEmployee } from "@/hooks/useOptimisticMutations";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string;
  avatar_id?: number | null;
  photo_url?: string | null;
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
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<InviteLink | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const { companyId, loading: authLoading } = useAuth();
  
  // Keyboard shortcut: / to focus search
  const searchInputRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchInputRef);

  const handleAddEmployee = () => {
    setShowAddEmployeeModal(true);
  };

  // Оптимистичная мутация для удаления приглашения
  const deleteInviteMutation = useOptimisticDeleteInvite();

  const handleDeleteInvite = (inviteId: string) => {
    deleteInviteMutation.mutate(inviteId, {
      onSuccess: () => {
        toast({
          title: "Приглашение удалено",
          description: "Приглашение успешно удалено",
        });
      },
      onError: () => {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить приглашение",
          variant: "destructive",
        });
      },
    });
  };

  // Оптимистичная мутация для удаления сотрудника
  const deleteEmployeeMutation = useOptimisticDeleteEmployee();

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      deleteEmployeeMutation.mutate(employeeToDelete.id, {
        onSuccess: () => {
          toast({
            title: "Сотрудник удалён",
            description: "Сотрудник успешно удалён из компании",
          });
          setShowDeleteDialog(false);
          setEmployeeToDelete(null);
        },
        onError: () => {
          toast({
            title: "Ошибка",
            description: "Не удалось удалить сотрудника",
            variant: "destructive",
          });
        },
      });
    }
  };

  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/companies', companyId, 'employees'],
    enabled: !!companyId,
    ...queryConfig.employees,
    // Регулярно обновляем список сотрудников, чтобы отобразить тех, кто подключился через Telegram
    refetchInterval: 5000,
  });

  const { data: invites = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery<EmployeeInvite[]>({
    queryKey: ['/api/companies', companyId, 'employee-invites'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/employee-invites`);
      return response.json();
    },
    enabled: !!companyId,
    ...queryConfig.employees,
    // После использования инвайта через Telegram быстро подтягиваем изменения
    refetchInterval: 5000,
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
      // apiRequest throws on non-ok responses, so we handle 404 and other errors here
      const errorMessage = error instanceof Error ? error.message : 'Не удалось получить ссылку-приглашение';
      const isNotFound = errorMessage.includes('404') || errorMessage.includes('Invite not found');
      
      toast({
        title: isNotFound ? "Приглашение не найдено" : "Ошибка",
        description: isNotFound 
          ? 'Приглашение не найдено или уже использовано' 
          : errorMessage,
        variant: "destructive"
      });
      console.error('Error fetching invite link:', error);
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
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeInvites = invites.filter(inv => !inv.used_at);

  // Retry hooks
  const employeesRetry = useRetry(['/api/companies', companyId, 'employees']);
  const invitesRetry = useRetry(['/api/companies', companyId, 'employee-invites']);

  // Loading state
  if (authLoading || employeesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <EmployeeListSkeleton count={6} />
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
    <div className="flex flex-col gap-5" data-testid="page-employees">
      <button
        onClick={handleAddEmployee}
        className="bg-[#e16546] px-[17px] py-3 rounded-[40px] flex items-center gap-2 text-sm font-medium text-white hover:bg-[#d15536] transition-colors w-fit"
        data-testid="button-add-employee"
      >
        <Plus className="w-3 h-3" />
        Добавить сотрудника
      </button>

      <div className="flex flex-wrap gap-4">
        {filteredEmployees.map((employee) => {
          const avatarUrl = getEmployeeAvatarUrl(employee);
          const initials = getEmployeeInitials(employee.full_name);

          return (
            <div
              key={employee.id}
              className="bg-[#f8f8f8] rounded-[20px] p-4 h-[230px] w-[267px] flex flex-col justify-between"
              data-testid={`employee-card-${employee.id}`}
            >
              {/* Top section: Avatar, Name, Position, Buttons */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={employee.full_name}
                      className="size-[50px] rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`size-[50px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium avatar-fallback ${avatarUrl ? 'hidden' : ''}`}>
                    {initials}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="text-base font-semibold text-black leading-[1.2]">
                      {employee.full_name}
                    </div>
                    <div className="text-sm text-[#e16546] leading-[1.2]">
                      {employee.position || 'Сотрудник'}
        </div>
      </div>
      </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowProfileModal(true);
                    }}
                    className="bg-[#e16546] rounded-[20px] size-8 flex items-center justify-center hover:bg-[#d15536] transition-colors"
                    aria-label="Открыть профиль сотрудника"
                  >
                    <Edit className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee)}
                    className="bg-white rounded-[20px] size-8 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                    aria-label="Удалить сотрудника"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom section: Phone, Email, ID */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  {employee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#959595]" />
                      <span className="text-sm text-[#959595] leading-[1.2]">
                        {employee.phone}
                      </span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#959595]" />
                      <span className="text-sm text-[#959595] leading-[1.2]">
                        {employee.email}
                      </span>
                  </div>
                )}
                </div>
                <div className="bg-white rounded-[20px] px-[10px] py-1 inline-flex items-center justify-center w-fit">
                  <span className="text-sm text-[#565656] leading-[1.2]">
                    ID: {employee.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* QR Code Dialog */}
      {selectedInvite && (
        <Dialog open={!!selectedInvite} onOpenChange={() => setSelectedInvite(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR-код для приглашения</DialogTitle>
              <DialogDescription>
                Отсканируйте QR-код в Telegram или поделитесь ссылкой
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* QR Code Image */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={selectedInvite.qr_code_url} 
                  alt="QR код приглашения" 
                  className="w-64 h-64"
                  data-testid="qr-code-image"
                />
              </div>
              
              {/* Invite Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Инвайт-код:</label>
                <div className="flex gap-2">
                  <Input 
                    value={selectedInvite.code} 
                    readOnly 
                    className="font-mono"
                    data-testid="input-invite-code"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopyCode(selectedInvite.code)}
                    data-testid="button-copy-code"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Deep Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Прямая ссылка:</label>
                <div className="flex gap-2">
                  <Input 
                    value={selectedInvite.deep_link} 
                    readOnly 
                    className="text-xs"
                    data-testid="input-deep-link"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopyLink(selectedInvite.deep_link)}
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedInvite(null)} data-testid="button-close-qr">
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Employee Profile Modal */}
      <EmployeeProfileModal
        open={showProfileModal}
        onOpenChange={(open) => {
          setShowProfileModal(open);
          if (!open) {
            // Clear selected employee when modal closes
            setSelectedEmployee(null);
          }
        }}
        employee={selectedEmployee}
        onEmployeeUpdated={(updatedEmployee) => {
          // Update selectedEmployee with fresh data
          setSelectedEmployee(updatedEmployee);
          // Update employee in the list
          queryClient.setQueriesData(
            { queryKey: ['/api/companies', companyId, 'employees'] },
            (old: any) => {
              if (!old || !Array.isArray(old)) return old;
              return old.map((emp: Employee) => 
                emp.id === updatedEmployee.id ? updatedEmployee : emp
              );
            }
          );
        }}
      />

      {/* Delete Employee Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сотрудника <strong>{employeeToDelete?.full_name}</strong>?
              <br />
              Это действие нельзя отменить. Все данные сотрудника будут удалены из компании.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
