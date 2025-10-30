import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  AlertTriangle, 
  Calendar, 
  Settings,
  Building2,
  Trophy
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar";
import companyLogo from '@assets/generated_images/Company_logo_placeholder_ad5bb1b0.png';

const menuItems = [
  {
    title: "Дашборд",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Нарушения",
    url: "/exceptions",
    icon: AlertTriangle,
  },
  {
    title: "Рейтинг",
    url: "/rating",
    icon: Trophy,
  },
  {
    title: "Сотрудники",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Отчеты",
    url: "/reports",
    icon: ClipboardList,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  }
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="Company Logo" className="w-8 h-8 rounded" />
          <div>
            <h2 className="font-semibold text-lg">outTime</h2>
            <p className="text-xs text-muted-foreground">ООО "РАРААВИС ГРУП"</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Управление</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url === '/settings' && (location === '/company' || location === '/schedules'))}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}