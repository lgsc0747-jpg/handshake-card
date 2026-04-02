import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { Loader2, Monitor, Smartphone, Palette, Save, Eye } from "lucide-react";

const BACKGROUND_PRESETS = [
  { id: "default", label: "Default", css: "none" },
  { id: "carbon", label: "Carbon Fiber", css: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 6px)" },
  { id: "mesh", label: "Mesh Gradient", css: "radial-gradient(at 40% 20%, hsla(178,80%,40%,0.3) 0px, transparent 50%), radial-gradient(at 80% 60%, hsla(280,60%,50%,0.2) 0px, transparent 50%)" },
  { id: "cyberpunk", label: "Cyberpunk Grid", css: "linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)" },
  { id: "marble", label: "Minimalist Marble", css: "linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.05) 25%, transparent 25%)" },
  { id: "holo", label: "Holographic", css: "linear-gradient(135deg, rgba(255,0,128,0.15), rgba(0,255,255,0.15), rgba(128,0,255,0.15))" },
];

interface PersonaPreview {
  id: string;
  slug: string;
  label: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  email_public: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  accent_color: string | null;
  background_preset: string | null;
  glass_opacity: number | null;
}

const DesignStudioPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personas, setPersonas] = useState<PersonaPreview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PersonaPreview | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: personaData }, { data: profile }] = await Promise.all([
        supabase.from("personas").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("profiles").select("username").eq("user_id", user.id).single(),
      ]);
      const list = (personaData as PersonaPreview[]) ?? [];
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

  const update = (field: keyof PersonaPreview, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...rest } = editing;
    const updateData: Record<string, unknown> = { ...rest };
    delete updateData.id;
    const { error } = await supabase.from("personas").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPersonas(personas.map((p) => (p.id === id ? editing : p)));
      toast({ title: "Design saved!" });
    }
    setSaving(false);
  };

  const presetCss = BACKGROUND_PRESETS.find((p) => p.id === editing?.background_preset)?.css ?? "none";

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
        <div className="glass-card rounded-lg p-12 text-center">
          <Palette className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Create a persona in the{" "}
            <a href="/personas" className="text-primary underline">Persona Vault</a>{" "}
            first, then customize its design here.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Design Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">Customize your persona's visual identity in real-time</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Design
          </Button>
        </div>

        {/* Persona selector */}
        <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select persona" />
          </SelectTrigger>
          <SelectContent>
            {personas.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Split-screen layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Controls */}
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Display Name</Label>
                  <Input value={editing?.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Headline</Label>
                  <Input value={editing?.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="Full-Stack Developer" />
                </div>
                <div className="space-y-1">
                  <Label>Bio</Label>
                  <Input value={editing?.bio ?? ""} onChange={(e) => update("bio", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Card Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editing?.accent_color ?? "#0d9488"}
                      onChange={(e) => update("accent_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      value={editing?.accent_color ?? "#0d9488"}
                      onChange={(e) => update("accent_color", e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Background Preset</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => update("background_preset", preset.id)}
                        className={`p-2.5 rounded-lg border text-xs text-center transition-colors ${
                          editing?.background_preset === preset.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Glass Opacity: {Math.round((editing?.glass_opacity ?? 0.15) * 100)}%</Label>
                  <Slider
                    value={[(editing?.glass_opacity ?? 0.15) * 100]}
                    onValueChange={([v]) => update("glass_opacity", v / 100)}
                    min={0}
                    max={80}
                    step={5}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Socials</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={editing?.email_public ?? ""} onChange={(e) => update("email_public", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input value={editing?.website ?? ""} onChange={(e) => update("website", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>LinkedIn</Label>
                  <Input value={editing?.linkedin_url ?? ""} onChange={(e) => update("linkedin_url", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>GitHub</Label>
                  <Input value={editing?.github_url ?? ""} onChange={(e) => update("github_url", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-display font-semibold">Live Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={deviceMode === "desktop" ? "default" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => setDeviceMode("desktop")}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={deviceMode === "mobile" ? "default" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => setDeviceMode("mobile")}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className={`relative rounded-2xl border-2 border-border overflow-hidden transition-all duration-300 ${
                  deviceMode === "mobile"
                    ? "w-[375px] min-h-[667px] border-[8px] border-muted-foreground/20 rounded-[2rem]"
                    : "w-full min-h-[500px]"
                }`}
                style={{
                  backgroundImage: presetCss !== "none" ? presetCss : undefined,
                  backgroundColor: "hsl(var(--background))",
                }}
              >
                {/* Simulated landing page preview */}
                <div className="p-6 flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: editing?.accent_color ?? "#0d9488" }}>
                      <span className="text-[8px] text-white font-bold">N</span>
                    </div>
                    <span className="text-[10px] font-display font-semibold tracking-widest uppercase text-muted-foreground">
                      NFC Hub
                    </span>
                  </div>

                  <InteractiveCard3D
                    name={editing?.display_name ?? "Your Name"}
                    headline={editing?.headline ?? undefined}
                    avatarUrl={editing?.avatar_url ?? undefined}
                    username={username}
                    accentColor={editing?.accent_color ?? "#0d9488"}
                    linkedinUrl={editing?.linkedin_url ?? undefined}
                    githubUrl={editing?.github_url ?? undefined}
                    website={editing?.website ?? undefined}
                    email={editing?.email_public ?? undefined}
                  />

                  <div className="w-full max-w-sm space-y-3">
                    <div className="text-center">
                      <h2 className="text-lg font-display font-bold">{editing?.display_name || "Your Name"}</h2>
                      {editing?.headline && <p className="text-sm text-muted-foreground">{editing.headline}</p>}
                    </div>
                    {editing?.bio && (
                      <div
                        className="rounded-lg p-3 text-xs leading-relaxed"
                        style={{
                          background: `rgba(255,255,255,${editing.glass_opacity ?? 0.15})`,
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        {editing.bio}
                      </div>
                    )}
                    <Button className="w-full text-primary-foreground" style={{ background: editing?.accent_color ?? "#0d9488" }}>
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
