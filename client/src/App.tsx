import { useMemo, useCallback } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { LazyMotion, domAnimation, AnimatePresence, m } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { slideUp } from "@/lib/motionPresets";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/ui/toaster";
import { TooltipProvider } from "@/ui/tooltip";
import { SidebarProvider } from "@/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/ui/button";
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

// Выносим за пределы компонента для оптимизации
const PAGE_TITLES: Record<string, string> = {
  "/": "Дашборд",
  "/exceptions": "Нарушения",
  "/rating": "Рейтинг",
  "/employees": "Сотрудники",
  "/reports": "Отчеты",
  "/settings": "Настройки",
  "/account/security": "Пароль и безопасность",
  "/legal": "Юридическая информация",
  "/help": "Помощь и поддержка",
  "/company": "Настройки",
};

function getPageTitle(location: string): string {
  return PAGE_TITLES[location] || "Страница";
}

function AppContent() {
  const [location] = useLocation();
  const { user, loading } = useAuth();

  // Мемоизируем стили и заголовок страницы
  const style = useMemo(() => ({
    "--sidebar-width": "303px",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties), []);

  const pageTitle = useMemo(() => getPageTitle(location), [location]);

  // Мемоизируем колбэки для уведомлений
  const handleNotificationAccept1 = useCallback(() => {
    console.log("Принято нарушение 1");
  }, []);

  const handleNotificationReject1 = useCallback(() => {
    console.log("Отклонено нарушение 1");
  }, []);

  const handleNotificationAccept2 = useCallback(() => {
    console.log("Принято нарушение 2");
  }, []);

  const handleNotificationReject2 = useCallback(() => {
    console.log("Отклонено нарушение 2");
  }, []);

  // Мемоизируем массив уведомлений
  const notifications = useMemo(() => [
    {
      id: "1",
      employeeName: "Иван Венгер",
      message: "Выявлено нарушение: опоздал на 4 минуты",
      onAccept: handleNotificationAccept1,
      onReject: handleNotificationReject1,
    },
    {
      id: "2",
      employeeName: "Иван Венгер",
      message: "Выявлено нарушение: опоздал на 2 часа",
      onAccept: handleNotificationAccept2,
      onReject: handleNotificationReject2,
    },
  ], [handleNotificationAccept1, handleNotificationReject1, handleNotificationAccept2, handleNotificationReject2]);

  // Мемоизируем триггер для уведомлений
  const notificationsTrigger = useMemo(() => (
    <Button 
      variant="outline"
      size="icon"
      className="relative rounded-full w-11 h-11"
      aria-label="Уведомления (2)"
    >
      <Bell className="w-6 h-6" />
      <div className="absolute bg-destructive border border-white text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center top-[3px] right-[3px] p-0 pointer-events-none">
        2
      </div>
    </Button>
  ), []);

  // Мемоизируем триггер для меню пользователя
  const userMenuTrigger = useMemo(() => (
    <Button 
      variant="outline"
      className="rounded-full px-[5px] py-[5px] pr-[13px] flex items-center gap-2"
      aria-label="Меню пользователя"
    >
      <div className="bg-destructive rounded-full size-8 overflow-hidden">
        {/* Placeholder for user avatar */}
      </div>
      <ChevronDown className="w-5 h-5" />
    </Button>
  ), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loader-auth">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicRoutes = ["/login", "/register", "/miniapp"];
  const isPublicRoute = publicRoutes.includes(location);
  const isAuthPage = location === "/login" || location === "/register";
  const isMiniAppPage = location === "/miniapp";

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
    <SidebarProvider style={style}>
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
            <h1 className="text-[30px] font-semibold text-[#1a1a1a]">{pageTitle}</h1>
            <div className="flex items-center gap-4">
              <NotificationsPopover
                notifications={notifications}
                trigger={notificationsTrigger}
              />
              <UserMenuPopover
                trigger={userMenuTrigger}
              />
            </div>
          </header>
          <main
            id="main-content"
            className="flex-1 overflow-auto bg-[#FFFFFF]"
            role="main"
            aria-label="Основной контент"
          >
            <LazyMotion features={domAnimation}>
              <AnimatePresence mode="wait">
                <m.div
                  key={location}
                  variants={slideUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <MainRouter />
                </m.div>
              </AnimatePresence>
            </LazyMotion>
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
