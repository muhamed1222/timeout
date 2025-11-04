import { useState, memo, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover";

interface INotification {
  id: string;
  employeeName: string;
  message: string;
  onAccept?: () => void;
  onReject?: () => void;
}

interface INotificationsPopoverProps {
  notifications: INotification[];
  trigger: React.ReactNode;
}

export const NotificationsPopover = memo(function NotificationsPopover({ 
  notifications, 
  trigger 
}: INotificationsPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleAccept = useCallback((notification: INotification) => {
    try {
      notification.onAccept?.();
    } catch (error) {
      console.error("Ошибка при принятии уведомления:", error);
    }
  }, []);

  const handleReject = useCallback((notification: INotification) => {
    try {
      notification.onReject?.();
    } catch (error) {
      console.error("Ошибка при отклонении уведомления:", error);
    }
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[322px] p-4 rounded-lg shadow-lg bg-background"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between h-6">
            <div className="text-sm font-medium text-muted-foreground">
              Уведомления ({notifications.length})
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Закрыть уведомления"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="flex flex-col gap-4">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="flex flex-col gap-2">
                <div className="text-sm font-medium text-foreground leading-tight">
                  {notification.employeeName}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-muted-foreground leading-normal">
                    {notification.message}
                  </div>
                  <div className="flex gap-2 items-start">
                    <Button
                      onClick={() => handleReject(notification)}
                      variant="outline"
                      size="sm"
                    >
                      Отклонить
                    </Button>
                    <Button
                      onClick={() => handleAccept(notification)}
                      variant="outline"
                      size="sm"
                      className="bg-green-500/10 text-green-600 hover:bg-green-500/15 border-green-500/20"
                    >
                      Принять
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Нет новых уведомлений
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

