import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeAvatarProps {
  name: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-12 w-12'
};

export default function EmployeeAvatar({ name, image, size = 'md', className = '' }: EmployeeAvatarProps) {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`} data-testid={`avatar-${name.toLowerCase().replace(' ', '-')}`}>
      <AvatarImage src={image} alt={name} />
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}