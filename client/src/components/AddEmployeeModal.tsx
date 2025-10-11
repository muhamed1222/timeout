import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, QrCode, Copy, Check } from "lucide-react";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmployeeInvite {
  id: string;
  code: string;
  full_name: string;
  position: string;
  deep_link: string;
  qr_code_url: string;
}

export function AddEmployeeModal({ open, onOpenChange }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
  });
  const [inviteData, setInviteData] = useState<EmployeeInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: { full_name: string; position: string }) => {
      // Создаем только инвайт для сотрудника
      const response = await fetch("/api/employee-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          full_name: data.full_name,
          position: data.position,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка создания инвайта");
      }

      return response.json();
    },
    onSuccess: async (invite) => {
      // Получаем ссылку и QR-код
      const linkResponse = await fetch(`/api/employee-invites/${invite.code}/link`);
      if (linkResponse.ok) {
        const linkData = await linkResponse.json();
        setInviteData({
          id: invite.id,
          code: invite.code,
          full_name: invite.full_name,
          position: invite.position,
          deep_link: linkData.deep_link,
          qr_code_url: linkData.qr_code_url,
        });
      }

      // Обновляем список инвайтов
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employee-invites"] });

      toast({
        title: "Инвайт создан",
        description: `Приглашение для ${formData.full_name} успешно создано`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать инвайт",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast({
        title: "Ошибка",
        description: "Имя сотрудника обязательно",
        variant: "destructive",
      });
      return;
    }

    createEmployeeMutation.mutate(formData);
  };

  const handleCopyLink = async () => {
    if (inviteData?.deep_link) {
      try {
        await navigator.clipboard.writeText(inviteData.deep_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
    }
  };

  const handleClose = () => {
    setFormData({ full_name: "", position: "" });
    setInviteData(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Пригласить сотрудника</DialogTitle>
          <DialogDescription>
            Создайте инвайт-код для нового сотрудника
          </DialogDescription>
        </DialogHeader>

        {!inviteData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Полное имя *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Иван Петров"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Менеджер"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createEmployeeMutation.isPending}
              >
                {createEmployeeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать инвайт
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-50">
                <img 
                  src={inviteData.qr_code_url} 
                  alt="QR код для подключения"
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Сотрудник: {inviteData.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Должность: {inviteData.position || "Не указана"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Код приглашения: {inviteData.code}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ссылка для подключения</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteData.deep_link} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyLink}
                  disabled={copied}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Инструкция для сотрудника:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Отсканируйте QR-код или перейдите по ссылке</li>
                <li>2. Откроется Telegram с ботом</li>
                <li>3. Нажмите "Начать" в боте</li>
                <li>4. Сотрудник будет автоматически подключен к системе</li>
              </ol>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Готово
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
