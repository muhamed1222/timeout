import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";

interface EmployeeAvatarProps {
  name: string;
  image?: string;
  employee?: {
    photo_url?: string | null;
    avatar_id?: number | null;
    full_name: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-12 w-12'
};

export default function EmployeeAvatar({ name, image, employee, size = 'md', className = '' }: EmployeeAvatarProps) {
  // Use employee data if provided, otherwise use image prop
  const avatarUrl = employee ? getEmployeeAvatarUrl(employee) : image || null;
  const initials = getEmployeeInitials(name);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`} data-testid={`avatar-${name.toLowerCase().replace(' ', '-')}`}>
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}