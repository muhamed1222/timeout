import { useState, memo, useCallback, useMemo } from "react";
import { 
  UserCircle, 
  Lock, 
  ShieldCheck, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Settings,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover";
import { useLocation } from "wouter";
import { LogoutDialog } from "@/components/LogoutDialog";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

interface IUserMenuPopoverProps {
  trigger: React.ReactNode;
}

export const UserMenuPopover = memo(function UserMenuPopover({ trigger }: IUserMenuPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleNavigate = useCallback((path: string) => {
    try {
      setLocation(path);
      setOpen(false);
    } catch (error) {
      console.error("Ошибка при навигации:", error);
    }
  }, [setLocation]);

  const handleLogout = useCallback(() => {
    setOpen(false);
    setIsLogoutDialogOpen(true);
  }, []);

  const handleLogoutDialogChange = useCallback((isOpen: boolean) => {
    setIsLogoutDialogOpen(isOpen);
  }, []);

  // Мемоизируем массив элементов меню
  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: "settings",
      label: "Настройки",
      icon: Settings,
      href: "/settings",
      onClick: () => handleNavigate("/settings"),
    },
    {
      id: "edit-company",
      label: "Редактировать компанию",
      icon: UserCircle,
      href: "/company",
      onClick: () => handleNavigate("/company"),
    },
    {
      id: "password",
      label: "Пароль и безопасность",
      icon: Lock,
      href: "/account/security",
      onClick: () => handleNavigate("/account/security"),
    },
    {
      id: "legal",
      label: "Юридическая информация",
      icon: ShieldCheck,
      href: "/legal",
      onClick: () => handleNavigate("/legal"),
    },
    {
      id: "help",
      label: "Помощь и поддержка",
      icon: HelpCircle,
      href: "/help",
      onClick: () => handleNavigate("/help"),
    },
    {
      id: "logout",
      label: "Выйти",
      icon: LogOut,
      variant: "danger" as const,
      onClick: handleLogout,
    },
  ], [handleNavigate, handleLogout]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-4 rounded-lg shadow-lg bg-background"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menuItems.length - 1;
            
            return (
              <div
                key={item.id}
                className={`
                  flex items-center justify-between
                  ${!isLast ? "border-b border-border pb-3" : ""}
                  cursor-pointer
                  group
                  hover:opacity-80
                  transition-opacity
                `}
                onClick={item.onClick}
              >
                <div className="flex gap-2 items-center">
                  <Icon className={`w-4 h-4 ${item.variant === "danger" ? "text-destructive" : "text-foreground"}`} />
                  <span className={`text-sm leading-tight ${item.variant === "danger" ? "text-destructive" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            );
          })}
        </div>
      </PopoverContent>
      <LogoutDialog open={isLogoutDialogOpen} onOpenChange={handleLogoutDialogChange} />
    </Popover>
  );
});

