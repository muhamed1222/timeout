/**
 * Страница управления сотрудниками
 * Отображает список сотрудников, приглашения и позволяет управлять ими
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/ui/alert-dialog";
import { Skeleton } from "@/ui/skeleton";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";
import { EmployeeProfileModal } from "@/components/EmployeeProfileModal";
import { EmployeeListSkeleton } from "@/components/LoadingSkeletons";
import { EmployeeCard } from "@/components/EmployeeCard";
import { InviteCard } from "@/components/InviteCard";
import { useSearchShortcut } from "@/hooks/useKeyboardShortcuts";
import { useOptimisticDeleteInvite, useOptimisticDeleteEmployee } from "@/hooks/useOptimisticMutations";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useEmployeeInvites } from "@/hooks/features/useEmployeeInvites";
import { useAuth } from "@/hooks/useAuth";
import { copyToClipboard } from "@/lib/utils/clipboard";
import type { EmployeeDisplay, InviteLink } from "@/types";

export default function Employees() {
  const [searchQuery] = useState("");
  const [selectedInvite, setSelectedInvite] = useState<InviteLink | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDisplay | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeDisplay | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const { companyId } = useAuth();
  
  // Хук для работы с сотрудниками
  const {
    employees,
    isLoading: employeesLoading,
    refetch: refetchEmployees,
  } = useEmployees(companyId || "");

  // Хук для работы с приглашениями
  const {
    activeInvites,
    isLoading: invitesLoading,
    refetchInvites,
    fetchInviteLink: fetchInviteLinkFromHook,
  } = useEmployeeInvites();

  // Фильтрация сотрудников
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.full_name.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const isLoading = employeesLoading || invitesLoading;
  
  // Keyboard shortcut: / to focus search
  const searchInputRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchInputRef);

  // Обработчики модальных окон
  const handleAddEmployee = useCallback(() => {
    setShowAddEmployeeModal(true);
  }, []);

  const handleEditEmployee = useCallback((employee: EmployeeDisplay) => {
    setSelectedEmployee(employee);
    setShowProfileModal(true);
  }, []);

  const handleCloseProfileModal = useCallback((open: boolean) => {
    setShowProfileModal(open);
    if (!open) {
      setSelectedEmployee(null);
    }
  }, []);

  // Оптимистичные мутации
  const deleteInviteMutation = useOptimisticDeleteInvite();
  const deleteEmployeeMutation = useOptimisticDeleteEmployee();

  const handleDeleteInvite = useCallback(
    (inviteId: string) => {
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
    },
    [deleteInviteMutation, toast]
  );

  const handleDeleteEmployee = useCallback((employee: EmployeeDisplay) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteEmployee = useCallback(() => {
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
  }, [employeeToDelete, deleteEmployeeMutation, toast]);

  // Работа с приглашениями
  const handleShowQR = useCallback(
    async (code: string) => {
    try {
        const inviteData = await fetchInviteLinkFromHook(code);
        if (inviteData) {
          setSelectedInvite(inviteData);
        }
    } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось получить ссылку-приглашение";
      toast({
          title: "Ошибка",
          description: errorMessage,
        variant: "destructive",
      });
      }
    },
    [fetchInviteLinkFromHook, toast]
  );

  const handleCopyCode = useCallback(
    async (code: string) => {
      try {
        await copyToClipboard(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({
      title: "Скопировано",
      description: "Инвайт-код скопирован в буфер обмена",
    });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать код",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleCopyLink = useCallback(
    async (link: string) => {
      try {
        await copyToClipboard(link);
    toast({
      title: "Скопировано",
      description: "Ссылка скопирована в буфер обмена",
    });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать ссылку",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Обновление данных после успешных операций
  const handleEmployeeUpdated = useCallback(
    (updatedEmployee: EmployeeDisplay) => {
      setSelectedEmployee(updatedEmployee);
      // Обновляем кеш всех запросов сотрудников
      queryClient.setQueriesData(
        { queryKey: ["/api/companies"] },
        (old: EmployeeDisplay[] | unknown) => {
          if (!old || !Array.isArray(old)) {
            return old;
          }
          return old.map((emp: EmployeeDisplay) =>
            emp.id === updatedEmployee.id ? updatedEmployee : emp
          );
        }
      );
    },
    []
  );

  const handleModalSuccess = useCallback(() => {
    refetchEmployees();
    refetchInvites();
  }, [refetchEmployees, refetchInvites]);

  // Loading state
  if (isLoading) {
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

  return (
    <div className="flex flex-col gap-5" data-testid="page-employees">
      <Button
        onClick={handleAddEmployee}
        className="w-fit"
        data-testid="button-add-employee"
      >
        <Plus className="w-3 h-3" />
        Добавить сотрудника
      </Button>

      <div className="flex flex-wrap gap-4">
        {filteredEmployees.map((employee) => (
          <EmployeeCard
              key={employee.id}
            employee={employee}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
          />
        ))}
      </div>

      {activeInvites.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Активные приглашения</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeInvites.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                onShowQR={handleShowQR}
                onCopyCode={handleCopyCode}
                onDelete={handleDeleteInvite}
              />
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
        onSuccess={handleModalSuccess}
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
              <div className="flex justify-center p-4 bg-background rounded-lg">
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
                    onClick={(): void => {
                      void handleCopyCode(selectedInvite.code);
                    }}
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
                    onClick={() => {
                      void handleCopyLink(selectedInvite.deep_link);
                    }}
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
        onOpenChange={handleCloseProfileModal}
        employee={selectedEmployee ? {
          id: selectedEmployee.id,
          full_name: selectedEmployee.full_name,
          position: selectedEmployee.position || "",
          telegram_user_id: selectedEmployee.telegram_user_id,
          status: selectedEmployee.status || "active",
          tz: selectedEmployee.tz || "UTC",
          avatar_id: selectedEmployee.avatar_id,
          photo_url: selectedEmployee.photo_url,
        } : null}
        onEmployeeUpdated={(updatedEmployee) => {
          handleEmployeeUpdated({
            ...updatedEmployee,
            company_id: selectedEmployee?.company_id || "",
            created_at: selectedEmployee?.created_at || null,
          });
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
