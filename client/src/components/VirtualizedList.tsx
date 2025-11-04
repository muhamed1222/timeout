// Компонент для виртуализации больших списков
// NOTE: react-window is optional, this component can be disabled if not installed

import React, { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Badge } from "@/ui/badge";
import type { Employee } from "@shared/schema";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";

interface IVirtualizedEmployeeListProps {
  employees: Employee[];
  height?: number;
  itemHeight?: number;
}

interface IEmployeeRowProps {
  index: number;
  style: React.CSSProperties;
  data: Employee[];
}

// Мемоизированный компонент строки
const EmployeeRow = memo<IEmployeeRowProps>(({ index, style, data }) => {
  const employee = data[index];
  const avatarUrl = getEmployeeAvatarUrl(employee as any);
  const initials = getEmployeeInitials(employee.full_name);

  return (
    <div style={style}>
      <Card className='hover-elevate m-2'>
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-3'>
            <Avatar>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <CardTitle className='text-base truncate'>
                {employee.full_name}
              </CardTitle>
              <p className='text-sm text-muted-foreground truncate'>
                {employee.position}
              </p>
            </div>
            <Badge
              variant={employee.status === "active" ? "default" : "secondary"}
            >
              {employee.status === "active" ? "Активен" : "Неактивен"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-1 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Часовой пояс:</span>
              <span>{employee.tz}</span>
            </div>
            {employee.telegram_user_id && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Telegram ID:</span>
                <span className='font-mono text-xs'>
                  {employee.telegram_user_id}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

EmployeeRow.displayName = "EmployeeRow";

export const VirtualizedEmployeeList: React.FC<
  IVirtualizedEmployeeListProps
> = ({ employees, height = 600, itemHeight = 200 }) => {
  // Simple non-virtualized list (react-window not installed)
  return (
    <div style={{ height, overflowY: 'auto' }}>
      {employees.map((employee, index) => (
        <EmployeeRow
          key={employee.id}
          index={index}
          style={{ height: itemHeight }}
          data={employees}
        />
      ))}
    </div>
  );
};

// Компонент для виртуализации смен
interface IShiftRowProps {
  index: number;
  style: React.CSSProperties;
  data: any[];
}

const ShiftRow = memo<IShiftRowProps>(({ index, style, data }) => {
  const shift = data[index];
  // If shift has employee data, use it; otherwise use employeeName for initials
  const avatarUrl = shift.employee ? getEmployeeAvatarUrl(shift.employee) : null;
  const initials = shift.employee 
    ? getEmployeeInitials(shift.employee.full_name)
    : getEmployeeInitials(shift.employeeName);

  return (
    <div style={style}>
      <Card className='hover-elevate m-2'>
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-3'>
            <Avatar>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <CardTitle className='text-base truncate'>
                {shift.employeeName}
              </CardTitle>
              <p className='text-sm text-muted-foreground truncate'>
                {shift.position}
              </p>
            </div>
            <Badge
              variant={shift.status === "active" ? "default" : "secondary"}
            >
              {shift.status === "active" ? "Активна" : "Завершена"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-1 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Начало:</span>
              <span>{shift.shiftStart}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Конец:</span>
              <span>{shift.shiftEnd}</span>
            </div>
            {shift.lastReport && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Последний отчет:</span>
                <span className='text-xs'>{shift.lastReport}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ShiftRow.displayName = "ShiftRow";

export const VirtualizedShiftList: React.FC<{
  shifts: any[];
  height?: number;
  itemHeight?: number;
}> = ({ shifts, height = 600, itemHeight = 200 }) => {
  // Simple non-virtualized list (react-window not installed)
  return (
    <div style={{ height, overflowY: 'auto' }}>
      {shifts.map((shift, index) => (
        <ShiftRow
          key={shift.id || index}
          index={index}
          style={{ height: itemHeight }}
          data={shifts}
        />
      ))}
    </div>
  );
};
