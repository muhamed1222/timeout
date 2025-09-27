import { AppSidebar } from '../AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 p-8 bg-background">
          <h1 className="text-2xl font-bold mb-4">Sidebar Navigation</h1>
          <p className="text-muted-foreground">
            This is the main content area. The sidebar shows the navigation menu for the shift management system.
          </p>
        </div>
      </div>
    </SidebarProvider>
  );
}