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
import NotFound from "@/pages/NotFound";
import WebAppPage from "@/pages/webapp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/exceptions" component={Exceptions} />
      <Route path="/employees" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Сотрудники</h1><p className="text-muted-foreground">Раздел в разработке</p></div>} />
      <Route path="/reports" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Отчеты</h1><p className="text-muted-foreground">Раздел в разработке</p></div>} />
      <Route path="/schedules" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Графики</h1><p className="text-muted-foreground">Раздел в разработке</p></div>} />
      <Route path="/settings" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Настройки</h1><p className="text-muted-foreground">Раздел в разработке</p></div>} />
      <Route path="/company" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Настройки компании</h1><p className="text-muted-foreground">Раздел в разработке</p></div>} />
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
