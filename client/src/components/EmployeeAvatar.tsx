/**
 * Компонент аватара сотрудника
 * Отображает фото или инициалы сотрудника с fallback на инициалы
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";
import type { EmployeeDisplay } from "@/types";

export interface IEmployeeAvatarProps {
  /** Имя сотрудника (используется для инициалов) */
  name: string;
  /** Прямой URL изображения (опционально) */
  image?: string;
  /** Данные сотрудника (приоритет над image) */
  employee?: Pick<EmployeeDisplay, "photo_url" | "avatar_id" | "full_name">;
  /** Размер аватара */
  size?: "sm" | "md" | "lg";
  /** Дополнительные CSS классы */
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10", 
  lg: "h-12 w-12",
};

export default function EmployeeAvatar({ name, image, employee, size = "md", className = "" }: IEmployeeAvatarProps) {
  // Use employee data if provided, otherwise use image prop
  const avatarUrl = employee ? getEmployeeAvatarUrl(employee) : image || null;
  const initials = getEmployeeInitials(name);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`} data-testid={`avatar-${name.toLowerCase().replace(" ", "-")}`}>
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback className="avatar-fallback bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
