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
      }}
    >
      <div className="relative flex flex-col items-center justify-center min-h-[480px] p-8">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${editing?.accent_color ?? "#0d9488"}25, transparent 70%)` }} />
        <div className="w-full max-w-xl">
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
            borderRadius={editing?.border_radius ?? 24}
          />
        </div>
      </div>
    </div>
  );

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
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground rounded-xl h-9">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>

        {/* Main Layout: Panel + Preview */}
        <div className="flex flex-col lg:flex-row gap-0 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
          {/* Panel with Tabs */}
          <div className="flex-1 min-h-0 flex flex-col lg:max-w-md lg:border-r lg:border-border/40">
            {/* Tab Switcher */}
            <div className="flex border-b border-border/40 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? "text-primary border-b-2 border-primary"
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
            <div className="flex-1 flex items-center justify-center p-4">
              {cardPreview}
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
