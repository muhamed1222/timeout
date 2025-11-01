import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, MessageSquare } from "lucide-react";
import EmployeeAvatar from "./EmployeeAvatar";
import StatusBadge, { type ShiftStatus } from "./StatusBadge";
import { usePrefetchEmployee, usePrefetchEmployeeStats } from "@/hooks/usePrefetch";

interface ShiftCardProps {
  employeeName: string;
  employeeImage?: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  status: ShiftStatus;
  location?: string;
  lastReport?: string;
  employeeId?: string; // For prefetching
  onViewDetails?: () => void;
  onSendMessage?: () => void;
}

export default function ShiftCard({ 
  employeeName, 
  employeeImage, 
  position, 
  shiftStart, 
  shiftEnd, 
  status, 
  location,
  lastReport,
  employeeId,
  onViewDetails,
  onSendMessage 
}: ShiftCardProps) {
  const prefetchEmployee = usePrefetchEmployee();
  const prefetchStats = usePrefetchEmployeeStats();

  const handleMouseEnter = () => {
    if (employeeId) {
      prefetchEmployee(employeeId);
      prefetchStats(employeeId);
    }
  };

  const handleViewDetails = () => {
    console.log('View details clicked for', employeeName);
    onViewDetails?.();
  };

  const handleSendMessage = () => {
    console.log('Send message clicked for', employeeName);
    onSendMessage?.();
  };

  return (
    <Card 
      className="hover-elevate" 
      data-testid={`card-shift-${employeeName.toLowerCase().replace(' ', '-')}`}
      role="article"
      aria-labelledby={`shift-${employeeName.toLowerCase().replace(' ', '-')}-title`}
      onMouseEnter={handleMouseEnter}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <EmployeeAvatar name={employeeName} image={employeeImage} />
          <div className="flex-1 min-w-0">
            <h3 
              id={`shift-${employeeName.toLowerCase().replace(' ', '-')}-title`}
              className="font-semibold text-sm truncate"
            >
              {employeeName}
            </h3>
            <p className="text-muted-foreground text-xs">{position}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-2 text-sm" aria-label="Время смены">
          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <time dateTime={`${shiftStart}--${shiftEnd}`}>
            {shiftStart} - {shiftEnd}
          </time>
        </div>
        
        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Местоположение">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>{location}</span>
          </div>
        )}

        {lastReport && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Последний отчет">
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span className="truncate">{lastReport}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewDetails} 
            data-testid="button-view-details"
            aria-label={`Подробнее о смене ${employeeName}`}
          >
            Подробнее
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSendMessage} 
            data-testid="button-send-message"
            aria-label={`Отправить сообщение ${employeeName}`}
          >
            Сообщение
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}