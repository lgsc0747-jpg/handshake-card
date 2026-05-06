import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <header className="h-12 flex items-center border-b border-border/40 px-4 bg-card/40 backdrop-blur-xl sticky top-0 z-10">
            <SidebarTrigger className="mr-3" />
            <div className="flex-1" />
            <NotificationBell />
          </header>
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" as any }}
          >
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
