import ShiftCard from '../ShiftCard';
import employeeImage from '@assets/generated_images/Professional_employee_avatar_7b6fbe18.png';

export default function ShiftCardExample() {
  //todo: remove mock functionality
  const mockShifts = [
    {
      employeeName: "Анна Петрова",
      employeeImage: employeeImage,
      position: "Менеджер продаж", 
      shiftStart: "09:00",
      shiftEnd: "18:00",
      status: "active" as const,
      location: "Офис Москва",
      lastReport: "Встреча с клиентом завершена"
    },
    {
      employeeName: "Михаил Сидоров",
      position: "Разработчик",
      shiftStart: "10:00", 
      shiftEnd: "19:00",
      status: "break" as const,
      lastReport: "Работаю над новой функцией"
    },
    {
      employeeName: "Елена Козлова",
      position: "Дизайнер",
      shiftStart: "09:30",
      shiftEnd: "18:30", 
      status: "late" as const,
      location: "Удаленно"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {mockShifts.map((shift) => (
        <ShiftCard key={shift.employeeName} {...shift} />
      ))}
    </div>
  );
}