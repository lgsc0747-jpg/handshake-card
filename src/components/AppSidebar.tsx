import { CreditCard, LayoutDashboard, List, User, Wifi, LogOut, Tag, Smartphone, Users, Mail, Palette, Settings, Crown, ShieldCheck, ShoppingBag, Store, BarChart3, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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

const nfcItems = [
  { title: "NFC Dashboard", url: "/", icon: LayoutDashboard },
  { title: "NFC Cards", url: "/cards", icon: CreditCard },
  { title: "NFC Manager", url: "/nfc-manager", icon: Smartphone },
  { title: "Card Studio", url: "/design-studio", icon: Palette },
  { title: "Page Builder", url: "/page-builder", icon: FileText },
  { title: "Interaction Logs", url: "/logs", icon: List },
  { title: "Categories", url: "/categories", icon: Tag },
];

const commerceItems = [
  { title: "Commerce Dashboard", url: "/commerce-dashboard", icon: BarChart3 },
  { title: "Storefront", url: "/storefront", icon: Store },
  { title: "Commerce", url: "/commerce", icon: ShoppingBag },
];

const generalItems = [
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Leads", url: "/leads", icon: Mail },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Plans", url: "/plans", icon: Crown },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Wifi className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            NFC Hub
          </span>
        )}
      </div>

      <SidebarContent>
        {/* NFC Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/70">
            NFC
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nfcItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/60 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Commerce Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/70">
            Commerce
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commerceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/60 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* General Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-widest text-muted-foreground/70">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...generalItems, ...(isAdmin ? [{ title: "Admin Panel", url: "/admin", icon: ShieldCheck }] : [])].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/60 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!collapsed && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success pulse-online" />
            <span className="truncate">{user?.email ?? "Online"}</span>
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
