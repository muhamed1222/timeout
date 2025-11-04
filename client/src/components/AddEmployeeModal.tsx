import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptimisticCreateInvite } from "@/hooks/useOptimisticMutations";
import { Loader2, QrCode, Copy, Check, X, ChevronDown } from "lucide-react";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EmployeeInvite {
  id: string;
  code: string;
  full_name: string;
  position: string;
  deep_link: string;
  qr_code_url: string;
}

export function AddEmployeeModal({ open, onOpenChange, onSuccess }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    position: "",
    schedulePeriod: "two_weeks",
    shiftStart: "10:00",
    breakDuration: "",
    shiftEnd: "",
    workingDays: [1, 2, 3, 4, 5], // Пн-Пт по умолчанию
  });
  const [inviteData, setInviteData] = useState<EmployeeInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const weekDays = [
    { value: 1, label: "Пн", full: "Понедельник" },
    { value: 2, label: "Вт", full: "Вторник" },
    { value: 3, label: "Ср", full: "Среда" },
    { value: 4, label: "Чт", full: "Четверг" },
    { value: 5, label: "Пт", full: "Пятница" },
    { value: 6, label: "Сб", full: "Суббота" },
    { value: 0, label: "Вс", full: "Воскресенье" },
  ];

  const toggleWorkingDay = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayValue)
        ? prev.workingDays.filter(d => d !== dayValue)
        : [...prev.workingDays, dayValue],
    }));
  };

  const createInviteMutation = useOptimisticCreateInvite();
  
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
        description: `Приглашение для ${formData.firstName} ${formData.lastName}`.trim() + " успешно создано",
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
    if (!formData.firstName.trim()) {
      toast({
        title: "Ошибка",
        description: "Имя сотрудника обязательно",
        variant: "destructive",
      });
      return;
    }

    const full_name = `${formData.firstName} ${formData.lastName}`.trim();
    createEmployeeMutation.mutate({
      full_name,
      position: formData.position,
    });
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
    setFormData({
      firstName: "",
      lastName: "",
      position: "",
      schedulePeriod: "two_weeks",
      shiftStart: "10:00",
      breakDuration: "",
      shiftEnd: "",
      workingDays: [1, 2, 3, 4, 5],
    });
    setInviteData(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 [&>button]:hidden ${!inviteData ? "sm:max-w-[620px]" : "sm:max-w-[425px]"}`}>
        {!inviteData ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                Добавление сотрудника
              </h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-[30px]">
              {/* Основные поля */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-[10px]">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm text-[#959595] leading-[1.2]">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                      placeholder="Иван"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm text-[#959595] leading-[1.2]">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                      placeholder="Петров"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#959595] leading-[1.2]">
                    Должность
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    placeholder="Руководитель отдела разработки"
                  />
                </div>
              </div>

              {/* График сотрудника */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-[#1a1a1a] leading-[1.2]">
                    График сотрудника
                  </h4>
                  <div className="relative">
                    <select
                      value={formData.schedulePeriod}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedulePeriod: e.target.value }))}
                      className="bg-[rgba(225,101,70,0.1)] px-[10px] py-1 rounded-[20px] text-sm text-[#e16546] appearance-none pr-8 focus:outline-none"
                      style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='7' height='4' viewBox='0 0 7 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0L3.5 4L7 0H0Z' fill='%23e16546'/%3E%3C/svg%3E\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                    >
                      <option value="two_weeks">На две недели</option>
                      <option value="one_week">На неделю</option>
                      <option value="month">На месяц</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-[10px]">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm text-[#959595] leading-[1.2]">
                      Начало смены
                    </label>
                    <input
                      type="time"
                      value={formData.shiftStart}
                      onChange={(e) => setFormData(prev => ({ ...prev, shiftStart: e.target.value }))}
                      className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm text-[#959595] leading-[1.2]">
                      Перерыв
                    </label>
                    <input
                      type="text"
                      value={formData.breakDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, breakDuration: e.target.value }))}
                      className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                      placeholder="30 мин"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-sm text-[#959595] leading-[1.2]">
                      Конец смены
                    </label>
                    <input
                      type="time"
                      value={formData.shiftEnd}
                      onChange={(e) => setFormData(prev => ({ ...prev, shiftEnd: e.target.value }))}
                      className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#959595] leading-[1.2]">
                    Рабочие дни
                  </label>
                  <div className="flex gap-[14px] items-center">
                    <div className="flex gap-1.5">
                      {weekDays.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWorkingDay(day.value)}
                          className={`px-[14px] py-[7px] rounded-lg text-sm leading-[1.2] transition-colors ${
                            formData.workingDays.includes(day.value)
                              ? "bg-[#e16546] text-white"
                              : "bg-[#f8f8f8] text-black"
                          }`}
                          aria-label={day.full}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit" 
                disabled={createEmployeeMutation.isPending || !formData.firstName.trim()}
                className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createEmployeeMutation.isPending ? (
                  <>
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Добавить"
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                Добавление сотрудника
              </h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-5 items-center">
              {/* QR Code */}
              <div className="size-[200px] flex items-center justify-center">
                <img 
                  src={inviteData.qr_code_url} 
                  alt="QR код для подключения"
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Ссылка для подключения и Инструкция */}
              <div className="flex flex-col gap-[10px] w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#959595] leading-[1.2]">
                    Ссылка для подключения
                  </label>
                  <div className="flex gap-[10px]">
                    <input
                      type="text"
                      value={inviteData.deep_link} 
                      readOnly 
                      className="flex-1 bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black leading-[1.2] truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      disabled={copied}
                      className="bg-[#f8f8f8] rounded-[12px] size-[41px] flex items-center justify-center hover:bg-[#eeeeee] transition-colors disabled:opacity-50"
                      aria-label={copied ? "Ссылка скопирована" : "Копировать ссылку"}
                    >
                      {copied ? (
                        <Check className="w-[18px] h-[18px] text-[#34c759]" />
                      ) : (
                        <Copy className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Инструкция */}
                <div className="bg-[#f8f8f8] rounded-[12px] p-3 flex flex-col gap-[10px]">
                  <h4 className="text-sm font-semibold text-black leading-[1.2]">
                    Инструкция для сотрудника:
                  </h4>
                  <ol className="list-decimal text-sm text-black leading-[1.2] space-y-[3px] ml-[21px]">
                    <li>Отсканируйте QR-код или перейдите по ссылке</li>
                    <li>Откроется Telegram с ботом</li>
                    <li>{"Нажмите \"Начать\" в боте"}</li>
                    <li>Сотрудник будет автоматически подключен к системе</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Кнопка Готово */}
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
