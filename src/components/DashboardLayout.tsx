import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { useLocation, Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Overview",
  "nfc-manager": "NFC Manager",
  "logs": "Logs",
  "funnel": "Funnel",
  "leads": "Leads",
  "agency": "Agency",
  "settings": "Settings",
  "plans": "Plans",
  "help": "Help",
  "admin": "Admin",
  "personas": "Personas",
  "design-studio": "Card Studio",
  "page-builder": "Page Builder",
  "persona-analytics": "Analytics",
  "profile": "Profile",
  "turnstile": "Turnstile",
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return <span className="text-[13px] font-medium text-foreground">Overview</span>;
  }
  return (
    <nav className="flex items-center gap-1 text-[13px] min-w-0">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors truncate">
        Handshake
      </Link>
      {parts.map((p, i) => {
        const path = "/" + parts.slice(0, i + 1).join("/");
        const isLast = i === parts.length - 1;
        const label = ROUTE_LABELS[p] ?? p.replace(/-/g, " ");
        return (
          <span key={path} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            {isLast ? (
              <span className="font-medium text-foreground truncate capitalize">{label}</span>
            ) : (
              <Link to={path} className="text-muted-foreground hover:text-foreground transition-colors truncate capitalize">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function CommandHint() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);
  const open = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: !isMac }));
  };
  return (
    <button
      onClick={open}
      className="hidden sm:flex items-center gap-2 h-7 px-2.5 rounded-sm border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[12px]"
    >
      <Search className="w-3 h-3" />
      <span>Search…</span>
      <kbd className="ml-2 inline-flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground/70">
        <span>{isMac ? "⌘" : "Ctrl"}</span>
        <span>K</span>
      </kbd>
    </button>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <header className="h-12 flex items-center gap-2 border-b border-border px-3 sm:px-4 bg-background sticky top-0 z-10">
            <SidebarTrigger className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border" />
            <div className="flex-1 min-w-0 overflow-hidden">
              <Breadcrumbs />
            </div>
            <CommandHint />
            <NotificationBell />
          </header>
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" as any }}
          >
            <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
