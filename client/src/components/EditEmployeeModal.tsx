import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Briefcase, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Employee = {
  id: string;
  full_name: string;
  position: string;
  telegram_user_id: string | null;
  status: string;
  tz: string;
};

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess?: () => void;
}

export function EditEmployeeModal({ open, onOpenChange, employee, onSuccess }: EditEmployeeModalProps) {
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("active");
  const [timezone, setTimezone] = useState("Europe/Moscow");
  
  const { toast } = useToast();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name);
      setPosition(employee.position);
      setStatus(employee.status);
      setTimezone(employee.tz || "Europe/Moscow");
    }
  }, [employee]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { full_name: string; position: string; status: string; tz: string }) => {
      if (!employee) return;
      
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка обновления сотрудника");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employees"] });
      
      toast({
        title: "Успешно",
        description: "Профиль сотрудника обновлен",
      });
      
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите имя сотрудника",
        variant: "destructive",
      });
      return;
    }
    
    if (!position.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите должность",
        variant: "destructive",
      });
      return;
    }

    updateEmployeeMutation.mutate({
      full_name: fullName.trim(),
      position: position.trim(),
      status,
      tz: timezone,
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Редактировать профиль сотрудника
          </DialogTitle>
          <DialogDescription>
            Измените информацию о сотруднике
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Полное имя *
            </Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="edit-position" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Должность *
            </Label>
            <Input
              id="edit-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Менеджер"
              required
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="inactive">Неактивен</SelectItem>
                <SelectItem value="on_leave">В отпуске</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="edit-timezone" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Часовой пояс
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="edit-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                <SelectItem value="Europe/Amsterdam">Амстердам (UTC+1)</SelectItem>
                <SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem>
                <SelectItem value="Asia/Novosibirsk">Новосибирск (UTC+7)</SelectItem>
                <SelectItem value="Asia/Krasnoyarsk">Красноярск (UTC+7)</SelectItem>
                <SelectItem value="Asia/Irkutsk">Иркутск (UTC+8)</SelectItem>
                <SelectItem value="Asia/Yakutsk">Якутск (UTC+9)</SelectItem>
                <SelectItem value="Asia/Vladivostok">Владивосток (UTC+10)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Telegram Info (read-only) */}
          {employee?.telegram_user_id && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <Label className="text-sm text-muted-foreground">Telegram ID</Label>
              <p className="text-sm font-mono">{employee.telegram_user_id}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateEmployeeMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={updateEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

