import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import Exceptions from "@/pages/Exceptions";
import Rating from "@/pages/Rating";
import Employees from "@/pages/Employees";
import Reports from "@/pages/Reports";
import Schedules from "@/pages/Schedules";
import Settings from "@/pages/Settings";
import CompanySettings from "@/pages/CompanySettings";
import NotFound from "@/pages/NotFound";
import WebAppPage from "@/pages/webapp";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/exceptions" component={Exceptions} />
      <Route path="/rating" component={Rating} />
      <Route path="/employees" component={Employees} />
      <Route path="/reports" component={Reports} />
      <Route path="/schedules" component={Schedules} />
      <Route path="/settings" component={Settings} />
      <Route path="/company" component={CompanySettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { user, loading } = useAuth();

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loader-auth">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicRoutes = ['/login', '/register', '/webapp'];
  const isPublicRoute = publicRoutes.includes(location);
  const isAuthPage = location === '/login' || location === '/register';
  const isWebAppPage = location === '/webapp';

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
        <Route path="/register" component={Register} />
      </Switch>
    );
  }

  if (isWebAppPage) {
    return <Route path="/webapp" component={WebAppPage} />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <MainRouter />
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
