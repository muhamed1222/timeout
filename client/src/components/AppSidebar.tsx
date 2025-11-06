import {
  Home,
  Award,
  Users,
  AlertCircle,
  FileText,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/ui/button";
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
  SidebarFooter,
} from "@/ui/sidebar";
import companyLogo from "@assets/generated_images/logotype.svg";

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
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const theme = window.localStorage.getItem("theme");
    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme = theme === "dark" || (!theme && systemTheme);

    setIsDark(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme);
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    window.localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return (
    <Sidebar className="[&_div[data-sidebar='sidebar']]:!bg-muted">
      <SidebarHeader className="p-2">
        <div className="bg-background rounded-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <img src={companyLogo} alt="Company Logo" className="w-6 h-6" />
            <div className="flex flex-col">
              <h2 className="font-semibold text-base leading-tight text-foreground">
                OutTime
              </h2>
            </div>
          </div>
          <p className="text-sm leading-tight text-muted-foreground">
            {'ООО "РАРААВИС ГРУП"'}
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-8">
        <SidebarGroup>
          <SidebarGroupLabel className="opacity-50 text-muted-foreground text-sm pl-4 pb-2 h-6">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`h-12 pl-4 pr-0 rounded-full font-normal ${
                        isActive
                          ? "bg-background text-primary hover:bg-background"
                          : "bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
                      }`}
                    >
                      <Link
                        href={item.url}
                        aria-label={`Перейти к ${item.title}`}
                        className="flex items-center gap-3"
                      >
                        <item.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="text-base leading-tight">
                          {item.title}
                        </span>
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
            className={`flex items-center gap-3 h-12 pl-4 pr-0 rounded-full transition-colors ${
              location === "/settings" || location === "/company"
                ? "text-muted-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-base leading-tight">Настройки</span>
          </Link>
          <div className="bg-muted rounded-xl p-1 flex gap-2">
            <Button
              onClick={() => {
                if (isDark) {
                  toggleTheme();
                }
              }}
              variant={!isDark ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-10 rounded-lg"
              aria-label="Переключить на светлую тему"
            >
              <Sun className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => {
                if (!isDark) {
                  toggleTheme();
                }
              }}
              variant={isDark ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-10 rounded-lg"
              aria-label="Переключить на тёмную тему"
            >
              <Moon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
