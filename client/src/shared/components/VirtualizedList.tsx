// Компонент для виртуализации больших списков

import React, { memo } from 'react';
import { List } from 'react-window';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Employee } from '@shared/types';

interface VirtualizedEmployeeListProps {
  employees: Employee[];
  height?: number;
  itemHeight?: number;
}

interface EmployeeRowProps {
  index: number;
  style: React.CSSProperties;
  data: Employee[];
}

// Мемоизированный компонент строки
const EmployeeRow = memo<EmployeeRowProps>(({ index, style, data }) => {
  const employee = data[index];

  return (
    <div style={style}>
      <Card className='hover-elevate m-2'>
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-3'>
            <Avatar>
              <AvatarFallback>
                {employee.full_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
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
              variant={employee.status === 'active' ? 'default' : 'secondary'}
            >
              {employee.status === 'active' ? 'Активен' : 'Неактивен'}
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

EmployeeRow.displayName = 'EmployeeRow';

export const VirtualizedEmployeeList: React.FC<
  VirtualizedEmployeeListProps
> = ({ employees, height = 600, itemHeight = 200 }) => {
  return (
    <List
      height={height}
      itemCount={employees.length}
      itemSize={itemHeight}
      itemData={employees}
      width='100%'
    >
      {EmployeeRow}
    </List>
  );
};

// Компонент для виртуализации смен
interface ShiftRowProps {
  index: number;
  style: React.CSSProperties;
  data: any[];
}

const ShiftRow = memo<ShiftRowProps>(({ index, style, data }) => {
  const shift = data[index];

  return (
    <div style={style}>
      <Card className='hover-elevate m-2'>
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-3'>
            <Avatar>
              <AvatarFallback>
                {shift.employeeName
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')}
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
              variant={shift.status === 'active' ? 'default' : 'secondary'}
            >
              {shift.status === 'active' ? 'Активна' : 'Завершена'}
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

ShiftRow.displayName = 'ShiftRow';

export const VirtualizedShiftList: React.FC<{
  shifts: any[];
  height?: number;
  itemHeight?: number;
}> = ({ shifts, height = 600, itemHeight = 200 }) => {
  return (
    <List
      height={height}
      itemCount={shifts.length}
      itemSize={itemHeight}
      itemData={shifts}
      width='100%'
    >
      {ShiftRow}
    </List>
  );
};
