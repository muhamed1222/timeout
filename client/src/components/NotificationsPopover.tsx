import { useState } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  employeeName: string;
  message: string;
  onAccept?: () => void;
  onReject?: () => void;
}

interface NotificationsPopoverProps {
  notifications: Notification[];
  trigger: React.ReactNode;
}

export function NotificationsPopover({ notifications, trigger }: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleAccept = (notification: Notification) => {
    notification.onAccept?.();
    // Можно добавить логику для удаления уведомления после принятия
  };

  const handleReject = (notification: Notification) => {
    notification.onReject?.();
    // Можно добавить логику для удаления уведомления после отклонения
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[322px] p-5 rounded-[20px] shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] bg-white border-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between h-6">
            <div className="text-sm font-medium text-[rgba(26,26,26,0.5)]">
              Уведомления ({notifications.length})
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-neutral-100 rounded transition-colors"
              aria-label="Закрыть уведомления"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex flex-col gap-4">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="flex flex-col gap-[5px]">
                <div className="text-sm font-medium text-[#1a1a1a] leading-[14.4px]">
                  {notification.employeeName}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-neutral-500 leading-normal">
                    {notification.message}
                  </div>
                  <div className="flex gap-2 items-start">
                    <button
                      onClick={() => handleReject(notification)}
                      className="bg-[#f8f8f8] px-[10px] py-2 rounded-[20px] text-xs font-medium text-black hover:bg-neutral-200 transition-colors"
                    >
                      Отклонить
                    </button>
                    <button
                      onClick={() => handleAccept(notification)}
                      className="bg-[rgba(52,199,94,0.08)] px-[10px] py-2 rounded-[20px] text-xs font-medium text-[#34c759] hover:bg-[rgba(52,199,94,0.15)] transition-colors"
                    >
                      Принять
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-sm text-neutral-500 text-center py-4">
              Нет новых уведомлений
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

