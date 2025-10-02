import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Exceptions from "@/pages/Exceptions";
import Employees from "@/pages/Employees";
import Reports from "@/pages/Reports";
import Schedules from "@/pages/Schedules";
import Settings from "@/pages/Settings";
import CompanySettings from "@/pages/CompanySettings";
import NotFound from "@/pages/NotFound";
import WebAppPage from "@/pages/webapp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/exceptions" component={Exceptions} />
      <Route path="/employees" component={Employees} />
      <Route path="/reports" component={Reports} />
      <Route path="/schedules" component={Schedules} />
      <Route path="/settings" component={Settings} />
      <Route path="/company" component={CompanySettings} />
      <Route path="/webapp" component={WebAppPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
