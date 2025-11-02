import { 
  Home, 
  Award, 
  Users, 
  AlertCircle, 
  FileText,
  Settings,
  Moon,
  Sun
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import companyLogo from '@assets/generated_images/logotype.svg';

const menuItems = [
  {
    title: "Дашборд",
    url: "/",
    icon: Home,
  },
  {
    title: "Рейтинг",
    url: "/rating",
    icon: Award,
  },
  {
    title: "Сотрудники",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Нарушения",
    url: "/exceptions",
    icon: AlertCircle,
  },
  {
    title: "Отчеты",
    url: "/reports",
    icon: FileText,
  }
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = theme === 'dark' || (!theme && systemTheme);
    
    setIsDark(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <Sidebar className="[&_div[data-sidebar='sidebar']]:!bg-[#f8f8f8]">
      <SidebarHeader className="p-2">
        <div className="bg-white rounded-2xl px-4 py-[10px] flex flex-col gap-1">
          <div className="flex items-center gap-[5px]">
            <img src={companyLogo} alt="Company Logo" className="w-6 h-6" />
            <div className="flex flex-col">
              <h2 className="font-semibold text-base leading-6 text-black">OutTime</h2>
            </div>
          </div>
          <p className="text-sm leading-[1.2] text-[rgba(0,0,0,0.5)]">{`ООО "РАРААВИС ГРУП"`}</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-[30px]">
        <SidebarGroup>
          <SidebarGroupLabel className="opacity-50 text-[#565656] text-sm pl-4 pb-[6px] h-6">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-[6px]">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={false}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={`h-12 pl-4 pr-0 rounded-[40px] font-normal ${
                        isActive 
                          ? 'bg-white text-[#e16546] hover:bg-white' 
                          : 'bg-transparent text-[#565656] hover:bg-transparent hover:text-[#565656]'
                      }`}
                    >
                      <Link href={item.url} aria-label={`Перейти к ${item.title}`} className="flex items-center gap-[10px]">
                        <item.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="text-base leading-[1.2]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-2">
        <div className="flex flex-col gap-2">
          <Link 
            href="/settings" 
            className={`flex items-center gap-[10px] h-12 pl-4 pr-0 ${
              location === '/settings' || location === '/company'
                ? 'text-[#959595]' 
                : 'text-[#565656]'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-base leading-[1.2]">Настройки</span>
          </Link>
          <div className="bg-[#eeeeee] rounded-2xl p-1 flex gap-2">
            <button
              onClick={() => {
                if (isDark) {
                  toggleTheme();
                }
              }}
              className={`flex-1 h-10 rounded-xl flex items-center justify-center transition-colors ${
                !isDark 
                  ? 'bg-white' 
                  : 'bg-transparent'
              }`}
              aria-label="Переключить на светлую тему"
            >
              <Sun className="h-[18.67px] w-5" />
            </button>
            <button
              onClick={() => {
                if (!isDark) {
                  toggleTheme();
                }
              }}
              className={`flex-1 h-10 rounded-full flex items-center justify-center transition-colors ${
                isDark 
                  ? 'bg-white' 
                  : 'bg-transparent'
              }`}
              aria-label="Переключить на тёмную тему"
            >
              <Moon className="h-[18.67px] w-5" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}