import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { getPresetCss } from "@/components/DesignStudio/BackgroundPresets";
import type { PersonaDesign } from "@/components/DesignStudio/types";
import { CardDesignPanel } from "@/components/studio/CardDesignPanel";
import { IdentityPanel } from "@/components/studio/IdentityPanel";
import { LandingPagePanel } from "@/components/studio/LandingPagePanel";
import {
  Loader2, Save, Eye, CreditCard, Palette, User, Image,
} from "lucide-react";

type StudioTab = "card" | "identity" | "landing";

const TABS: { id: StudioTab; label: string; icon: typeof Palette }[] = [
  { id: "card", label: "Card", icon: Palette },
  { id: "identity", label: "Identity", icon: User },
  { id: "landing", label: "Landing", icon: Image },
];

const DesignStudioPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [personas, setPersonas] = useState<(PersonaDesign & { page_mode?: string })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<(PersonaDesign & { page_mode?: string }) | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>("card");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: personaData }, { data: profile }] = await Promise.all([
        supabase.from("personas").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("profiles").select("username").eq("user_id", user.id).single(),
      ]);
      const list = (personaData as unknown as (PersonaDesign & { page_mode?: string })[]) ?? [];
      setPersonas(list);
      setUsername(profile?.username ?? "");
      if (list.length > 0) { setSelectedId(list[0].id); setEditing({ ...list[0] }); }
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    const p = personas.find((p) => p.id === selectedId);
    if (p) setEditing({ ...p });
  }, [selectedId]);

  const update = (field: keyof PersonaDesign | "page_mode", value: unknown) => {
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
            Create a persona in the <Link to="/personas" className="text-primary underline">Persona Vault</Link> first.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const cardPreview = (
    <div
      className="relative overflow-hidden rounded-2xl w-full"
      style={{
        backgroundColor: editing?.landing_bg_color ?? "hsl(var(--background))",
        backgroundImage: editing?.background_image_url
          ? `url(${editing.background_image_url})`
          : presetCss !== "none" ? presetCss : undefined,
        backgroundSize: editing?.background_image_url ? "cover" : undefined,
        backgroundPosition: editing?.background_image_url ? "center" : undefined,
        minHeight: "480px",
      }}
    >
      {/* NFC Card Hero Section — compact preview */}
      <div className="relative flex flex-col items-center justify-center min-h-[340px] p-4">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${editing?.accent_color ?? "#0d9488"}15, transparent 70%)` }} />

        {/* Branding */}
        <div className="absolute top-2 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: editing?.accent_color ?? "#0d9488" }}>
            <span className="text-white text-[7px] font-bold">H</span>
          </div>
          <span className="text-[8px] font-display font-semibold tracking-widest uppercase" style={{ color: `${editing?.text_color ?? "#fff"}99` }}>
            Handshake
          </span>
        </div>

        <div className="w-full max-w-md">
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
            avatarPosition={editing?.avatar_position as any}
            cardBgPosition={editing?.card_bg_position as any}
            glassOpacity={editing?.glass_opacity ?? 0.15}
            linkedinUrl={editing?.linkedin_url ?? undefined}
            githubUrl={editing?.github_url ?? undefined}
            website={editing?.website ?? undefined}
            email={editing?.email_public ?? undefined}
            fontFamily={editing?.font_family ?? "Space Grotesk"}
            textAlignment={editing?.text_alignment ?? "left"}
            cardBlur={editing?.card_blur ?? 12}
            cardTexture={editing?.card_texture ?? "none"}
            borderRadius={editing?.border_radius ?? 24}
          />
        </div>
      </div>

      {/* Info Section Preview — compact */}
      <div style={{ backgroundColor: editing?.landing_bg_color ?? "#0a0a0f" }} className="px-4 py-5 space-y-3">
        {editing?.avatar_url && (
          <div className="w-12 h-12 rounded-full mx-auto border-2 border-white/20 overflow-hidden">
            <img src={editing.avatar_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="text-center space-y-1">
          <h2 className="text-base font-display font-bold" style={{ color: editing?.text_color ?? "#fff" }}>
            {editing?.display_name || "Your Name"}
          </h2>
          {editing?.headline && (
            <p className="text-[11px]" style={{ color: `${editing?.text_color ?? "#fff"}99` }}>{editing.headline}</p>
          )}
          {editing?.bio && (
            <div className="mt-2 p-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-[11px] leading-relaxed" style={{ color: `${editing?.text_color ?? "#fff"}dd` }}>{editing.bio}</p>
            </div>
          )}
        </div>

        {/* Action button preview */}
        <div className="w-full h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white" style={{ backgroundColor: editing?.accent_color ?? "#0d9488" }}>
          📇 Save Contact
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Top Bar — Brutalist */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-eyebrow text-muted-foreground">Workspace</p>
              <h1 className="text-title-1 font-display">Card Studio</h1>
            </div>
            <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-44 rounded-sm h-9 text-xs">
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-sm h-9">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>

        {/* Main Layout: Panel + Preview */}
        <div className="flex flex-col lg:flex-row gap-0 rounded-sm border border-border bg-card overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>
          {/* Panel with Tabs */}
          <div className="flex-1 min-h-0 flex flex-col lg:max-w-md lg:border-r lg:border-border">
            {/* Tab Switcher */}
            <div className="flex border-b border-border shrink-0 bg-muted/30">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-eyebrow transition-colors ${
                      activeTab === tab.id
                        ? "text-foreground bg-background border-b-2 border-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {activeTab === "card" && (
                <CardDesignPanel editing={editing} update={update} isPro={isPro} />
              )}
              {activeTab === "identity" && (
                <IdentityPanel editing={editing} update={update} isPro={isPro} />
              )}
              {activeTab === "landing" && (
                <LandingPagePanel editing={editing} update={update} isPro={isPro} />
              )}
            </div>
          </div>

          {/* Live Preview — Desktop */}
          <div className="flex-1 hidden lg:flex flex-col overflow-y-auto bg-background/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-3">
              <div className="w-full max-w-xl">{cardPreview}</div>
            </div>
          </div>

          {/* Mobile Preview FAB */}
          <div className="lg:hidden fixed bottom-6 right-6 z-50">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-full h-14 w-14 shadow-xl gradient-primary">
                  <Eye className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-y-auto">
                <div className="p-4 border-b border-border/40">
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Live Preview</span>
                  </div>
                </div>
                <div className="flex items-center justify-center p-4">
                  <div className="scale-[0.95] origin-center w-full max-w-sm">
                    {cardPreview}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DesignStudioPage;
