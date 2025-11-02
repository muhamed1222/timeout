import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bell, ChevronDown } from "lucide-react";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { UserMenuPopover } from "@/components/UserMenuPopover";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import Dashboard from "@/pages/Dashboard";
import Exceptions from "@/pages/Exceptions";
import Rating from "@/pages/Rating";
import Employees from "@/pages/Employees";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Security from "@/pages/Security";
import Legal from "@/pages/Legal";
import Help from "@/pages/Help";
import NotFound from "@/pages/NotFound";
import WebAppPage from "@/pages/webapp";
import Login from "@/pages/Login";

function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/exceptions" component={Exceptions} />
      <Route path="/rating" component={Rating} />
      <Route path="/employees" component={Employees} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/account/security" component={Security} />
      <Route path="/legal" component={Legal} />
      <Route path="/help" component={Help} />
      {/* Legacy routes - redirect to new structure */}
      <Route path="/security">
        <Redirect to="/account/security" />
      </Route>
      <Route path="/privacy-policy">
        <Redirect to="/legal" />
      </Route>
      <Route path="/terms-of-service">
        <Redirect to="/legal" />
      </Route>
      <Route path="/legal/privacy-policy">
        <Redirect to="/legal" />
      </Route>
      <Route path="/legal/terms">
        <Redirect to="/legal" />
      </Route>
      <Route path="/faq">
        <Redirect to="/help" />
      </Route>
      <Route path="/help/faq">
        <Redirect to="/help" />
      </Route>
      <Route path="/help/contacts">
        <Redirect to="/help" />
      </Route>
      <Route path="/help/guides">
        <Redirect to="/help" />
      </Route>
      <Route path="/company">
        <Redirect to="/settings" />
      </Route>
      <Route path="/webapp">
        <Redirect to="/miniapp" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function getPageTitle(location: string): string {
  const titles: Record<string, string> = {
    '/': 'Дашборд',
    '/exceptions': 'Нарушения',
    '/rating': 'Рейтинг',
    '/employees': 'Сотрудники',
    '/reports': 'Отчеты',
    '/settings': 'Настройки',
    '/account/security': 'Пароль и безопасность',
    '/legal': 'Юридическая информация',
    '/help': 'Помощь и поддержка',
    '/company': 'Настройки',
  };
  return titles[location] || 'Страница';
}

function AppContent() {
  const [location] = useLocation();
  const { user, loading } = useAuth();

  const style = {
    "--sidebar-width": "303px",
    "--sidebar-width-icon": "4rem",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loader-auth">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicRoutes = ['/login', '/register', '/miniapp'];
  const isPublicRoute = publicRoutes.includes(location);
  const isAuthPage = location === '/login' || location === '/register';
  const isMiniAppPage = location === '/miniapp';

  if (user && isAuthPage) {
    return <Redirect to="/" />;
  }

  if (!user && !isPublicRoute) {
    return <Redirect to="/login" />;
  }

  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register">
        <Redirect to="/login" />
      </Route>
      </Switch>
    );
  }

  if (isMiniAppPage) {
    return <Route path="/miniapp" component={WebAppPage} />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
        aria-label="Перейти к основному контенту"
      >
        Перейти к основному контенту
      </a>
      <div className="flex h-screen w-full bg-[#FFFFFF]">
        <AppSidebar />
        <div className="flex flex-col flex-1 bg-[#FFFFFF]">
          <header className="flex items-center justify-between bg-[#FFFFFF] pt-5 pr-5 pb-5" role="banner">
            <h1 className="text-[30px] font-semibold text-[#1a1a1a]">{getPageTitle(location)}</h1>
            <div className="flex items-center gap-4">
              <NotificationsPopover
                notifications={[
                  {
                    id: "1",
                    employeeName: "Иван Венгер",
                    message: "Выявлено нарушение: опоздал на 4 минуты",
                    onAccept: () => console.log("Принято нарушение 1"),
                    onReject: () => console.log("Отклонено нарушение 1"),
                  },
                  {
                    id: "2",
                    employeeName: "Иван Венгер",
                    message: "Выявлено нарушение: опоздал на 2 часа",
                    onAccept: () => console.log("Принято нарушение 2"),
                    onReject: () => console.log("Отклонено нарушение 2"),
                  },
                ]}
                trigger={
                  <button 
                    className="relative border border-neutral-100 rounded-full w-11 h-11 flex items-center justify-center hover:bg-neutral-50 transition-colors cursor-pointer"
                    aria-label="Уведомления (2)"
                  >
                    <Bell className="w-6 h-6" />
                    <div className="absolute bg-[#ff3b30] border border-white text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center top-[3px] right-[3px] p-0 pointer-events-none">
                      2
                    </div>
                  </button>
                }
              />
              <UserMenuPopover
                trigger={
                  <button 
                    className="border border-neutral-100 rounded-full px-[5px] py-[5px] pr-[13px] flex items-center gap-2 hover:bg-neutral-50 transition-colors cursor-pointer"
                    aria-label="Меню пользователя"
                  >
                    <div className="bg-[#ff3b30] rounded-full size-8 overflow-hidden">
                      {/* Placeholder for user avatar */}
                    </div>
                    <ChevronDown className="w-5 h-5" />
                  </button>
                }
              />
            </div>
          </header>
        <main
          id="main-content"
          className="flex-1 overflow-auto bg-[#FFFFFF]"
          role="main"
          aria-label="Основной контент"
        >
          <MainRouter />
          <CommandPalette />
        </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
