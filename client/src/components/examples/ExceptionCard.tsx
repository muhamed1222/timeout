import ExceptionCard from '../ExceptionCard';
import employeeImage from '@assets/generated_images/Professional_employee_avatar_7b6fbe18.png';

export default function ExceptionCardExample() {
  //todo: remove mock functionality
  const mockExceptions = [
    {
      employeeName: "Анна Петрова",
      employeeImage: employeeImage,
      type: "late" as const,
      description: "Опоздание на 25 минут. Смена должна была начаться в 09:00",
      timestamp: "09:25",
      severity: 2 as const
    },
    {
      employeeName: "Михаил Сидоров", 
      type: "no_report" as const,
      description: "Не подал ежедневный отчет за вчера",
      timestamp: "Вчера",
      severity: 1 as const
    },
    {
      employeeName: "Елена Козлова",
      type: "no_show" as const, 
      description: "Не вышел на работу, не предупредил заранее",
      timestamp: "08:00",
      severity: 3 as const
    }
  ];

  return (
    <div className="space-y-4 p-4">
      {mockExceptions.map((exception, index) => (
        <ExceptionCard key={index} {...exception} />
      ))}
    </div>
  );
}