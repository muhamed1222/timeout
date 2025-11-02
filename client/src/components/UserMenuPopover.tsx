import { useState } from "react";
import { 
  UserCircle, 
  Lock, 
  ShieldCheck, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Settings
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface UserMenuPopoverProps {
  trigger: React.ReactNode;
}

export function UserMenuPopover({ trigger }: UserMenuPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const menuItems: MenuItem[] = [
    {
      id: "settings",
      label: "Настройки",
      icon: Settings,
      href: "/settings",
      onClick: () => {
        setLocation("/settings");
        setOpen(false);
      },
    },
    {
      id: "edit-company",
      label: "Редактировать компанию",
      icon: UserCircle,
      href: "/company",
      onClick: () => {
        setLocation("/company");
        setOpen(false);
      },
    },
    {
      id: "password",
      label: "Пароль и безопасность",
      icon: Lock,
      href: "/account/security",
      onClick: () => {
        setLocation("/account/security");
        setOpen(false);
      },
    },
    {
      id: "legal",
      label: "Юридическая информация",
      icon: ShieldCheck,
      href: "/legal",
      onClick: () => {
        setLocation("/legal");
        setOpen(false);
      },
    },
    {
      id: "help",
      label: "Помощь и поддержка",
      icon: HelpCircle,
      href: "/help",
      onClick: () => {
        setLocation("/help");
        setOpen(false);
      },
    },
    {
      id: "logout",
      label: "Выйти",
      icon: LogOut,
      variant: "danger",
      onClick: () => {
        setOpen(false);
        setIsLogoutDialogOpen(true);
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-4 rounded-[20px] shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] bg-white border-0"
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
                  ${!isLast ? 'border-b border-[#f8f8f8] pb-3' : ''}
                  cursor-pointer
                  group
                `}
                onClick={item.onClick}
              >
                <div className="flex gap-1.5 items-center">
                  <Icon className={`w-3.5 h-3.5 ${item.variant === 'danger' ? 'text-[#e16546]' : ''}`} />
                  <span className={`text-sm leading-[1.2] ${item.variant === 'danger' ? 'text-[#e16546]' : 'text-black'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 rotate-180 text-black/30 group-hover:text-black/50 transition-colors" />
              </div>
            );
          })}
        </div>
      </PopoverContent>
      <LogoutDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen} />
    </Popover>
  );
}

