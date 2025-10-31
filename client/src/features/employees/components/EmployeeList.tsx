// Компонент списка сотрудников

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter } from 'lucide-react';
import { Employee } from '@shared/types/entities/employee';

interface EmployeeListProps {
  employees: Employee[];
  isLoading: boolean;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export function EmployeeList({
  employees,
  isLoading,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
}: EmployeeListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
    case 'active':
      return 'Активен';
    case 'inactive':
      return 'Неактивен';
    case 'suspended':
      return 'Заблокирован';
    default:
      return status;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Сотрудники</CardTitle>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm'>
              <Search className='h-4 w-4 mr-2' />
              Поиск
            </Button>
            <Button variant='outline' size='sm'>
              <Filter className='h-4 w-4 mr-2' />
              Фильтр
            </Button>
            <Button onClick={onAddEmployee}>
              <Plus className='h-4 w-4 mr-2' />
              Добавить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>Загрузка...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className='text-right'>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-center py-8 text-muted-foreground'
                  >
                    Сотрудники не найдены
                  </TableCell>
                </TableRow>
              ) : (
                employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        <Avatar>
                          <AvatarImage src={employee.avatar_url} />
                          <AvatarFallback>
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='font-medium'>
                            {employee.full_name}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            ID: {employee.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(employee.status)}>
                        {getStatusLabel(employee.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {employee.telegram_user_id ? (
                        <Badge variant='outline'>
                          @{employee.telegram_user_id}
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground'>
                          Не привязан
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(employee.created_at).toLocaleDateString(
                        'ru-RU'
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onEditEmployee(employee)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onDeleteEmployee(employee.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
