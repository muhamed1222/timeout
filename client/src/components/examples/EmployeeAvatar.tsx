import EmployeeAvatar from '../EmployeeAvatar';
import employeeImage from '@assets/generated_images/Professional_employee_avatar_7b6fbe18.png';

export default function EmployeeAvatarExample() {
  return (
    <div className="flex items-center gap-4 p-4">
      <EmployeeAvatar name="Анна Петрова" size="sm" />
      <EmployeeAvatar name="Михаил Сидоров" size="md" image={employeeImage} />
      <EmployeeAvatar name="Елена Козлова" size="lg" />
    </div>
  );
}