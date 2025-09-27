import RecentActivity, { type ActivityItem } from '../RecentActivity';
import employeeImage from '@assets/generated_images/Professional_employee_avatar_7b6fbe18.png';

export default function RecentActivityExample() {
  //todo: remove mock functionality
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      employeeName: 'Анна Петрова',
      employeeImage: employeeImage,
      type: 'shift_start',
      description: 'Начала рабочую смену',
      timestamp: '09:15'
    },
    {
      id: '2', 
      employeeName: 'Михаил Сидоров',
      type: 'report_submitted',
      description: 'Отправил ежедневный отчет',
      timestamp: '18:30'
    },
    {
      id: '3',
      employeeName: 'Елена Козлова',
      type: 'break_start',
      description: 'Начала обеденный перерыв',
      timestamp: '13:00'
    },
    {
      id: '4',
      employeeName: 'Дмитрий Волков',
      type: 'shift_end',
      description: 'Завершил рабочую смену',
      timestamp: '17:45'
    }
  ];

  return (
    <div className="max-w-md p-4">
      <RecentActivity activities={mockActivities} />
    </div>
  );
}