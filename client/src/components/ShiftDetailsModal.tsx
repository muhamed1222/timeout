import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Badge } from "@/ui/badge";
import { Clock, Calendar, User, MapPin, MessageSquare } from "lucide-react";
import type { ShiftStatus } from "./StatusBadge";
import StatusBadge from "./StatusBadge";

interface IShiftDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  status: ShiftStatus;
  location?: string;
  lastReport?: string;
}

export default function ShiftDetailsModal({
  open,
  onOpenChange,
  employeeName,
  position,
  shiftStart,
  shiftEnd,
  status,
  location,
  lastReport,
}: IShiftDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Детали смены
          </DialogTitle>
          <DialogDescription>
            Подробная информация о текущей смене сотрудника
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Сотрудник:</span>
              <span className="text-sm">{employeeName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Должность:</span>
              <span className="text-sm text-muted-foreground">{position}</span>
            </div>
          </div>

          {/* Shift Time */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Время смены
            </div>
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">Начало:</span>
              <span className="text-sm font-mono">{shiftStart}</span>
            </div>
            <div className="flex items-center justify-between pl-6">
              <span className="text-sm text-muted-foreground">Окончание:</span>
              <span className="text-sm font-mono">{shiftEnd}</span>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Статус:</span>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4" />
                Локация
              </div>
              <p className="text-sm text-muted-foreground pl-6">{location}</p>
            </div>
          )}

          {/* Last Report */}
          {lastReport && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                Последний отчет
              </div>
              <p className="text-sm text-muted-foreground pl-6">{lastReport}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

