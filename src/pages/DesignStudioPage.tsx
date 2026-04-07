import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeOverlay } from "@/components/UpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { getPresetCss } from "@/components/DesignStudio/BackgroundPresets";
import type { PersonaDesign } from "@/components/DesignStudio/types";
import { CardDesignPanel } from "@/components/studio/CardDesignPanel";
import { LandingPagePanel } from "@/components/studio/LandingPagePanel";
import { IdentityPanel } from "@/components/studio/IdentityPanel";
import { SectionBuilder } from "@/components/commerce/SectionBuilder";
import { cn } from "@/lib/utils";
import {
  Loader2, Monitor, Smartphone, Save, Eye,
  CreditCard, Layout, LayoutGrid, User, Wifi,
} from "lucide-react";

type PanelId = "card" | "landing" | "sections" | "identity";

const NAV_SECTIONS = [
  {
    group: "NFC Card",
    items: [
      { id: "card" as PanelId, label: "Card Design", icon: CreditCard },
    ],
  },
  {
    group: "Page",
    items: [
      { id: "landing" as PanelId, label: "Landing Page", icon: Layout },
      { id: "sections" as PanelId, label: "Page Sections", icon: LayoutGrid },
    ],
  },
  {
    group: "Content",
    items: [
      { id: "identity" as PanelId, label: "Profile & Links", icon: User },
    ],
  },
];

const DesignStudioPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [personas, setPersonas] = useState<PersonaDesign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PersonaDesign | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>("card");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("mobile");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: personaData }, { data: profile }] = await Promise.all([
        supabase.from("personas").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("profiles").select("username").eq("user_id", user.id).single(),
      ]);
      const list = (personaData as unknown as PersonaDesign[]) ?? [];
      setPersonas(list);
      setUsername(profile?.username ?? "");
      if (list.length > 0) {
        setSelectedId(list[0].id);
        setEditing({ ...list[0] });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    const p = personas.find((p) => p.id === selectedId);
    if (p) setEditing({ ...p });
  }, [selectedId]);

  const update = (field: keyof PersonaDesign, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, slug, label, ...rest } = editing;
    const { error } = await supabase.from("personas").update(rest as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPersonas(personas.map((p) => (p.id === id ? editing : p)));
      toast({ title: "Design saved!" });
    }
    setSaving(false);
  };

  const presetCss = getPresetCss(editing?.background_preset);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (personas.length === 0) {
    return (
      <DashboardLayout>
        <div className="glass-card rounded-2xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Create a persona in the{" "}
            <a href="/personas" className="text-primary underline">Persona Vault</a>{" "}
            first, then customize its design here.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const renderPanel = () => {
    switch (activePanel) {
      case "card":
        return <CardDesignPanel editing={editing} update={update} isPro={isPro} />;
      case "landing":
        return <LandingPagePanel editing={editing} update={update} isPro={isPro} />;
      case "sections":
        return isPro ? (
          selectedId && <SectionBuilder personaId={selectedId} />
        ) : (
          <UpgradeOverlay feature="Page Builder" description="Upgrade to Pro to customize page sections.">
            {selectedId && <SectionBuilder personaId={selectedId} />}
          </UpgradeOverlay>
        );
      case "identity":
        return <IdentityPanel editing={editing} update={update} isPro={isPro} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-display font-bold">Card Studio</h1>
            <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-44 rounded-xl h-9 text-xs">
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground rounded-xl h-9">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
        </div>

        {/* Main Layout: Sidebar + Panel + Preview */}
        <div className="flex flex-col md:flex-row gap-0 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden" style={{ minHeight: "calc(100vh - 180px)" }}>
          {/* Sub-Sidebar Nav */}
          <nav className="w-48 shrink-0 border-r border-border/40 bg-card/50 hidden md:block overflow-y-auto">
            <div className="p-3 space-y-1">
              {NAV_SECTIONS.map((section) => (
                <div key={section.group} className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 py-2">
                    {section.group}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = activePanel === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActivePanel(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden w-full border-b border-border/40 bg-card/50 overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-max">
              {NAV_SECTIONS.flatMap((s) => s.items).map((item) => {
                const Icon = item.icon;
                const active = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 lg:max-w-sm lg:border-r lg:border-border/40">
            {renderPanel()}
          </div>

          {/* Live Preview — Always Visible */}
          <div className="flex-1 hidden lg:flex flex-col overflow-y-auto bg-background/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                <Button size="sm" variant={deviceMode === "desktop" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("desktop")}>
                  <Monitor className="w-3 h-3" />
                </Button>
                <Button size="sm" variant={deviceMode === "mobile" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("mobile")}>
                  <Smartphone className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex items-start justify-center p-6">
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  deviceMode === "mobile"
                    ? "w-[320px] min-h-[580px] border-[6px] border-muted-foreground/15 rounded-[2rem]"
                    : "w-full min-h-[400px] rounded-2xl border border-border/60"
                )}
                style={{
                  backgroundColor: editing?.landing_bg_color ?? "hsl(var(--background))",
                  backgroundImage: editing?.background_image_url
                    ? `url(${editing.background_image_url})`
                    : presetCss !== "none" ? presetCss : undefined,
                  backgroundSize: editing?.background_image_url ? "cover" : undefined,
                  backgroundPosition: editing?.background_image_url ? "center" : undefined,
                }}
              >
                <div className="relative flex flex-col items-center justify-center min-h-[350px] p-6">
                  {/* Ambient glow */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${editing?.accent_color ?? "#0d9488"}25, transparent 70%)` }}
                  />

                  {/* Brand badge */}
                  <div className="flex items-center gap-1.5 absolute top-4">
                    <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: editing?.accent_color ?? "#0d9488" }}>
                      <Wifi className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-[9px] font-display font-semibold tracking-widest uppercase text-muted-foreground">NFC Hub</span>
                  </div>

                  {/* 3D Card */}
                  <div className="scale-[0.85] origin-center mt-6">
                    <InteractiveCard3D
                      name={editing?.display_name ?? "Your Name"}
                      headline={editing?.headline ?? undefined}
                      avatarUrl={editing?.avatar_url ?? undefined}
                      username={username}
                      accentColor={editing?.accent_color ?? "#0d9488"}
                      secondaryColor={editing?.secondary_color ?? undefined}
                      tertiaryColor={editing?.tertiary_color ?? undefined}
                      textColor={editing?.text_color ?? "#ffffff"}
                      cardBgImageUrl={editing?.card_bg_image_url ?? undefined}
                      cardBgSize={editing?.card_bg_size ?? "cover"}
                      glassOpacity={editing?.glass_opacity ?? 0.15}
                      linkedinUrl={editing?.linkedin_url ?? undefined}
                      githubUrl={editing?.github_url ?? undefined}
                      website={editing?.website ?? undefined}
                      email={editing?.email_public ?? undefined}
                      fontFamily={editing?.font_family ?? "Space Grotesk"}
                      textAlignment={editing?.text_alignment ?? "left"}
                      cardBlur={editing?.card_blur ?? 12}
                      cardTexture={editing?.card_texture ?? "none"}
                    />
                  </div>

                  {/* Mini profile info */}
                  <div className="w-full max-w-[260px] space-y-2 mt-5 opacity-70">
                    <div className="text-center">
                      <h2 className="text-xs font-display font-bold" style={{ color: editing?.text_color ?? "#fff" }}>
                        {editing?.display_name || "Your Name"}
                      </h2>
                      {editing?.headline && (
                        <p className="text-[9px]" style={{ color: `${editing?.text_color ?? "#fff"}99` }}>{editing.headline}</p>
                      )}
                    </div>
                    {editing?.bio && (
                      <div className="rounded-xl p-2 text-[9px] leading-relaxed bg-white/5 backdrop-blur-md border border-white/10" style={{ color: `${editing?.text_color ?? "#fff"}cc` }}>
                        {editing.bio}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full text-[10px] h-8 rounded-xl"
                      style={{ background: editing?.accent_color ?? "#0d9488", color: editing?.text_color ?? "#fff" }}
                    >
                      Save Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DesignStudioPage;
