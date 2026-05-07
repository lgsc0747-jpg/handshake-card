import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  CreditCard, LayoutDashboard, List, User, LogOut, Smartphone, Mail, Settings,
  Crown, ShieldCheck, RotateCcw, Contact, Sliders, Sparkles, Building2, GripVertical,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

const DEFAULT_NFC: NavItem[] = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "NFC Manager", url: "/nfc-manager", icon: Smartphone },
  { title: "Logs", url: "/logs", icon: List },
];

const DEFAULT_GENERAL: NavItem[] = [
  { title: "Funnel", url: "/funnel", icon: Sparkles },
  { title: "Leads", url: "/leads", icon: Mail },
  { title: "Agency", url: "/agency", icon: Building2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Plans", url: "/plans", icon: Crown },
];

function reorderFromStorage(key: string, defaults: NavItem[]): NavItem[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaults;
    const order: string[] = JSON.parse(stored);
    const map = new Map(defaults.map((d) => [d.title, d]));
    const result = order.map((t) => map.get(t)).filter(Boolean) as NavItem[];
    defaults.forEach((d) => { if (!result.find((r) => r.title === d.title)) result.push(d); });
    return result;
  } catch {
    return defaults;
  }
}

function SortableNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.title });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <SidebarMenuItem ref={setNodeRef} style={style} className="group/item">
      <SidebarMenuButton asChild className="rounded-md p-0 h-auto">
        <div className="flex items-center w-full">
          <div
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab opacity-0 group-hover/item:opacity-60 transition-opacity pl-1"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="relative flex-1 flex items-center gap-2.5 rounded-sm pl-2 pr-3 py-1.5 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-accent"
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </NavLink>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SortableNavGroup({
  label, storageKey, defaults, collapsed, sensors,
}: {
  label: string;
  storageKey: string;
  defaults: NavItem[];
  collapsed: boolean;
  sensors: ReturnType<typeof useSensors>;
}) {
  const [items, setItems] = useState(() => reorderFromStorage(storageKey, defaults));

  useEffect(() => {
    setItems(reorderFromStorage(storageKey, defaults));
  }, [defaults.length, storageKey]);

  const handleSortEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.title === active.id);
    const newIdx = items.findIndex((i) => i.title === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const updated = arrayMove(items, oldIdx, newIdx);
    setItems(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated.map((i) => i.title)));
  };

  return (
    <SidebarGroup className="px-2">
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 px-2 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
          <SortableContext items={items.map((i) => i.title)} strategy={verticalListSortingStrategy}>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SortableNavItem key={item.title} item={item} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SortableContext>
        </DndContext>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { isPro } = useSubscription();
  const location = useLocation();
  const onAdminRoute = location.pathname.startsWith("/admin");

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const generalItems: NavItem[] =
    isAdmin && onAdminRoute
      ? [
          ...DEFAULT_GENERAL,
          { title: "Help", url: "/help", icon: Contact },
          { title: "Admin", url: "/admin", icon: ShieldCheck },
          ...(isSuperAdmin ? [{ title: "Turnstile", url: "/admin/turnstile", icon: Sliders }] : []),
        ]
      : [...DEFAULT_GENERAL, { title: "Help", url: "/help", icon: Contact }];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className={cn("flex items-center gap-2 h-12 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="w-6 h-6 rounded-sm bg-foreground text-background flex items-center justify-center shrink-0">
          <span className="font-mono text-[11px] font-bold tracking-tight">H</span>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-display text-[13px] font-bold tracking-tight text-foreground truncate">
              Handshake
            </span>
            {isPro && (
              <span className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-accent text-accent-foreground uppercase">
                Pro
              </span>
            )}
          </div>
        )}
      </div>

      <SidebarContent className="pt-2">
        <SortableNavGroup label="NFC" storageKey="sidebar_nfc_order" defaults={DEFAULT_NFC} collapsed={collapsed} sensors={sensors} />
        <SortableNavGroup label="Workspace" storageKey="sidebar_general_order" defaults={generalItems} collapsed={collapsed} sensors={sensors} />

        {isAdmin && !collapsed && (
          <SidebarGroup className="px-2 mt-auto">
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 px-2 mb-1">
              View
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-muted/50 border border-border">
                <NavLink
                  to="/"
                  end
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-all",
                    !onAdminRoute ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  activeClassName=""
                >
                  <User className="w-3 h-3" /> User
                </NavLink>
                <NavLink
                  to="/admin"
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-all",
                    onAdminRoute ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  activeClassName=""
                >
                  <ShieldCheck className="w-3 h-3" /> Admin
                </NavLink>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[11px] text-muted-foreground truncate">{user?.email ?? "Online"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  localStorage.removeItem("sidebar_nfc_order");
                  localStorage.removeItem("sidebar_general_order");
                  window.location.reload();
                }}
                title="Reset nav order"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
