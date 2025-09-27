import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileX, UserX, Coffee } from "lucide-react";
import EmployeeAvatar from "./EmployeeAvatar";

export type ExceptionType = 'late' | 'no_report' | 'short_day' | 'long_break' | 'no_show';

interface ExceptionCardProps {
  employeeName: string;
  employeeImage?: string;
  type: ExceptionType;
  description: string;
  timestamp: string;
  severity: 1 | 2 | 3;
  onResolve?: () => void;
  onContact?: () => void;
}

const exceptionConfig = {
  late: {
    icon: Clock,
    color: 'text-shift-late',
    bgColor: 'bg-shift-late/10',
    title: 'Опоздание'
  },
  no_report: {
    icon: FileX,
    color: 'text-shift-missed',
    bgColor: 'bg-shift-missed/10',
    title: 'Нет отчета'
  },
  short_day: {
    icon: AlertTriangle,
    color: 'text-shift-break',
    bgColor: 'bg-shift-break/10',
    title: 'Короткий день'
  },
  long_break: {
    icon: Coffee,
    color: 'text-shift-break',
    bgColor: 'bg-shift-break/10',
    title: 'Долгий перерыв'
  },
  no_show: {
    icon: UserX,
    color: 'text-shift-missed',
    bgColor: 'bg-shift-missed/10',
    title: 'Не явился'
  }
};

const severityColors = {
  1: 'border-l-shift-break',
  2: 'border-l-shift-late', 
  3: 'border-l-shift-missed'
};

export default function ExceptionCard({ 
  employeeName, 
  employeeImage, 
  type, 
  description, 
  timestamp, 
  severity,
  onResolve,
  onContact 
}: ExceptionCardProps) {
  const config = exceptionConfig[type];
  const Icon = config.icon;

  const handleResolve = () => {
    console.log('Resolve exception for', employeeName);
    onResolve?.();
  };

  const handleContact = () => {
    console.log('Contact employee', employeeName);
    onContact?.();
  };

  return (
    <Card className={`hover-elevate border-l-4 ${severityColors[severity]} ${config.bgColor}`} 
          data-testid={`card-exception-${type}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{config.title}</h3>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
            <div className="flex items-center gap-2">
              <EmployeeAvatar name={employeeName} image={employeeImage} size="sm" />
              <span className="text-sm font-medium">{employeeName}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResolve} data-testid="button-resolve-exception">
            Решить
          </Button>
          <Button variant="ghost" size="sm" onClick={handleContact} data-testid="button-contact-employee">
            Связаться
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}