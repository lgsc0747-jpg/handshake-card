import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Users,
  UserCircle,
  TrendingUp,
  FileText,
  Settings,
  Wifi,
  Building2,
  HelpCircle,
  PlusCircle,
  LogOut,
  Sparkles,
} from "lucide-react";

type Persona = { id: string; slug: string; label: string };
type Lead = { id: string; visitor_email: string; visitor_name: string | null };

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase
          .from("personas")
          .select("id, slug, label")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("lead_captures")
          .select("id, visitor_email, visitor_name")
          .eq("owner_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setPersonas(p ?? []);
      setLeads(l ?? []);
    })();
  }, [open, user]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const navItems = useMemo(
    () => [
      { icon: Home, label: "Dashboard", path: "/" },
      { icon: Users, label: "Personas", path: "/personas" },
      { icon: UserCircle, label: "Leads", path: "/leads" },
      { icon: TrendingUp, label: "Funnel", path: "/funnel" },
      { icon: Wifi, label: "NFC Devices", path: "/nfc" },
      { icon: FileText, label: "Logs", path: "/logs" },
      { icon: Building2, label: "Agency", path: "/agency" },
      { icon: Settings, label: "Settings", path: "/settings" },
      { icon: HelpCircle, label: "Help", path: "/help" },
    ],
    [],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search personas, leads, or jump anywhere…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/personas")}>
            <PlusCircle className="mr-2 h-4 w-4" /> New persona
          </CommandItem>
          <CommandItem onSelect={() => go("/design-studio")}>
            <Sparkles className="mr-2 h-4 w-4" /> Open design studio
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navItems.map((n) => (
            <CommandItem key={n.path} onSelect={() => go(n.path)}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {personas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Personas">
              {personas.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`persona ${p.label} ${p.slug}`}
                  onSelect={() => go(`/personas/${p.slug}/analytics`)}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span className="flex-1">{p.label}</span>
                  <span className="text-xs text-muted-foreground">/{p.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {leads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent leads">
              {leads.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lead ${l.visitor_email} ${l.visitor_name ?? ""}`}
                  onSelect={() => go("/leads")}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span className="flex-1">{l.visitor_name ?? l.visitor_email}</span>
                  <span className="text-xs text-muted-foreground">{l.visitor_email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem
                onSelect={async () => {
                  setOpen(false);
                  await supabase.auth.signOut();
                  navigate("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
