import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  
  const { toast } = useToast();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  // Update form when employee changes
  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name);
      setPosition(employee.position);
    }
  }, [employee]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { full_name: string; position: string }) => {
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
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
            Редактировать профиль сотрудника
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="size-[80px] rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-medium text-2xl">
              {employee?.full_name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="edit-fullName" className="text-sm font-medium text-[#1a1a1a] leading-[1.2] block">
              Полное имя *
            </label>
            <input
              id="edit-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иван Иванов"
              required
              className="w-full px-4 py-3 rounded-[12px] border border-[#eeeeee] bg-white text-[#1a1a1a] text-sm leading-[1.2] focus:outline-none focus:border-[#e16546] transition-colors"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label htmlFor="edit-position" className="text-sm font-medium text-[#1a1a1a] leading-[1.2] block">
              Должность *
            </label>
            <input
              id="edit-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Менеджер"
              required
              className="w-full px-4 py-3 rounded-[12px] border border-[#eeeeee] bg-white text-[#1a1a1a] text-sm leading-[1.2] focus:outline-none focus:border-[#e16546] transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateEmployeeMutation.isPending}
              className="flex-1 bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm font-medium text-[#1a1a1a] hover:bg-[#eeeeee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={updateEmployeeMutation.isPending}
              className="flex-1 bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {updateEmployeeMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Сохранить
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

