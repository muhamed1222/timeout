// Template avatars - same as in components
const TEMPLATE_AVATARS = [
  { id: 1, image: "/avatars/1.png" },
  { id: 2, image: "/avatars/2.png" },
  { id: 3, image: "/avatars/3.png" },
  { id: 4, image: "/avatars/4.png" },
  { id: 5, image: "/avatars/5.png" },
  { id: 6, image: "/avatars/6.png" },
  { id: 7, image: "/avatars/7.png" },
  { id: 8, image: "/avatars/8.png" },
];

type EmployeeWithAvatar = {
  photo_url?: string | null;
  avatar_id?: number | null;
  full_name: string;
};

/**
 * Get avatar image URL for an employee
 * Priority: photo_url > template avatar (avatar_id) > null (use initials)
 */
export function getEmployeeAvatarUrl(employee: EmployeeWithAvatar): string | null {
  // First priority: uploaded photo
  if (employee.photo_url) {
    return employee.photo_url;
  }
  
  // Second priority: template avatar
  if (employee.avatar_id) {
    const avatar = TEMPLATE_AVATARS.find(a => a.id === employee.avatar_id);
    if (avatar) {
      return avatar.image;
    }
  }
  
  // No avatar - use initials
  return null;
}

/**
 * Get employee initials from full name
 */
export function getEmployeeInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

