import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CreditCard, LayoutDashboard, List, User, Wifi, LogOut, Smartphone, Users, Mail, Palette, Settings, Crown, ShieldCheck, FileText, GripVertical, RotateCcw, Contact, Sliders, Sparkles } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

const DEFAULT_NFC: NavItem[] = [
  { title: "NFC Dashboard", url: "/", icon: LayoutDashboard },
  { title: "NFC Manager", url: "/nfc-manager", icon: Smartphone },
  { title: "Card Studio", url: "/design-studio", icon: Palette },
  { title: "Page Builder", url: "/page-builder", icon: FileText },
  { title: "Interaction Logs", url: "/logs", icon: List },
];


const DEFAULT_GENERAL: NavItem[] = [
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Leads", url: "/leads", icon: Mail },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Plans", url: "/plans", icon: Crown },
];

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, CreditCard, Smartphone, Palette, FileText, List,
  Users, Mail, Settings, Crown, ShieldCheck, Contact,
};

function reorderFromStorage(key: string, defaults: NavItem[]): NavItem[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaults;
    const order: string[] = JSON.parse(stored);
    const map = new Map(defaults.map(d => [d.title, d]));
    const result = order.map(t => map.get(t)).filter(Boolean) as NavItem[];
    defaults.forEach(d => { if (!result.find(r => r.title === d.title)) result.push(d); });
    return result;
  } catch { return defaults; }
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
      <SidebarMenuButton asChild className="rounded-xl">
        <div className="flex items-center w-full">
          <div {...attributes} {...listeners} className="touch-none cursor-grab mr-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
          </div>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="flex-1 flex items-center rounded-xl px-2.5 py-1.5 text-sm transition-all hover:bg-sidebar-accent/40 hover:backdrop-blur-md"
            activeClassName="bg-sidebar-accent/70 backdrop-blur-md border border-border/40 text-sidebar-accent-foreground font-medium shadow-[var(--shadow-card)]"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SortableNavGroup({ label, storageKey, defaults, collapsed, sensors }: {
  label: string;
  storageKey: string;
  defaults: NavItem[];
  collapsed: boolean;
  sensors: ReturnType<typeof useSensors>;
}) {
  const [items, setItems] = useState(() => reorderFromStorage(storageKey, defaults));

  // Re-sync when defaults change (e.g. admin role loads async)
  useEffect(() => {
    setItems(reorderFromStorage(storageKey, defaults));
  }, [defaults.length, storageKey]);

  const handleSortEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.title === active.id);
    const newIdx = items.findIndex(i => i.title === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const updated = arrayMove(items, oldIdx, newIdx);
    setItems(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated.map(i => i.title)));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
          <SortableContext items={items.map(i => i.title)} strategy={verticalListSortingStrategy}>
            <SidebarMenu>
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

function SidebarBrandName() {
  const { isPro } = useSubscription();
  return (
    <span className="font-display text-lg font-bold tracking-tight text-foreground">
      {isPro ? "Handshake+" : "Handshake"}
    </span>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isSuperAdmin } = useIsSuperAdmin();
  const location = useLocation();
  const onAdminRoute = location.pathname.startsWith("/admin");

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // When admin is currently viewing the user side (not on /admin/*),
  // hide the Admin Panel + Turnstile Settings to keep the user view clean.
  const generalItems: NavItem[] = isAdmin && onAdminRoute
    ? [
        ...DEFAULT_GENERAL,
        { title: "Help & Support", url: "/help", icon: Contact },
        { title: "Admin Panel", url: "/admin", icon: ShieldCheck },
        ...(isSuperAdmin
          ? [{ title: "Turnstile Settings", url: "/admin/turnstile", icon: Sliders }]
          : []),
      ]
    : [
        ...DEFAULT_GENERAL,
        { title: "Help & Support", url: "/help", icon: Contact },
      ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <img src="/favicon.ico" alt="Handshake" className="w-5 h-5" />
        </div>
        {!collapsed && (
          <SidebarBrandName />
        )}
      </div>

      <SidebarContent>
        <SortableNavGroup label="NFC" storageKey="sidebar_nfc_order" defaults={DEFAULT_NFC} collapsed={collapsed} sensors={sensors} />
        
        <SortableNavGroup label="General" storageKey="sidebar_general_order" defaults={generalItems} collapsed={collapsed} sensors={sensors} />

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/70">
              View Mode
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2 pb-2">
              <div className={cn(
                "rounded-xl bg-muted/40 border border-border p-1 grid",
                collapsed ? "grid-cols-1 gap-1" : "grid-cols-2 gap-1",
              )}>
                <NavLink
                  to="/"
                  end
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                    !onAdminRoute
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  activeClassName=""
                >
                  <User className="w-3.5 h-3.5" />
                  {!collapsed && <span>User</span>}
                </NavLink>
                <NavLink
                  to="/admin"
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                    onAdminRoute
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  activeClassName=""
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!collapsed && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success pulse-online" />
              <span className="truncate">{user?.email ?? "Online"}</span>
            </div>
            <button
              onClick={() => { localStorage.removeItem("sidebar_nfc_order"); localStorage.removeItem("sidebar_general_order"); window.location.reload(); }}
              title="Reset nav order"
              className="hover:text-primary transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
