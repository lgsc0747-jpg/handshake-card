import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { ColorPickerField } from "@/components/DesignStudio/ColorPickerField";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { BACKGROUND_PRESETS, getPresetCss } from "@/components/DesignStudio/BackgroundPresets";
import { CARD_TEXTURE_PRESETS } from "@/components/DesignStudio/CardTexturePresets";
import { FONT_PRESETS } from "@/components/DesignStudio/FontPresets";
import type { PersonaDesign } from "@/components/DesignStudio/types";
import {
  Loader2, Monitor, Smartphone, Palette, Save, Eye,
  CreditCard, Layout, Type,
  AlignLeft, AlignCenter, AlignRight, FileText, Upload,
} from "lucide-react";

const TEXT_ALIGNMENTS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
];

const DesignStudioPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [personas, setPersonas] = useState<PersonaDesign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PersonaDesign | null>(null);
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
      const list = (personaData as PersonaDesign[]) ?? [];
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
    const { error } = await supabase.from("personas").update(rest as Record<string, unknown>).eq("id", id);
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
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
          <Tabs defaultValue="card" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card" className="text-xs gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Card
              </TabsTrigger>
              <TabsTrigger value="landing" className="text-xs gap-1">
                <Layout className="w-3.5 h-3.5" /> Landing Page
              </TabsTrigger>
              <TabsTrigger value="identity" className="text-xs gap-1">
                <Type className="w-3.5 h-3.5" /> Identity
              </TabsTrigger>
            </TabsList>

            {/* ── Card Tab ── */}
            <TabsContent value="card" className="space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Card Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ColorPickerField
                      label="Primary / Accent"
                      value={editing?.accent_color ?? "#0d9488"}
                      onChange={(v) => update("accent_color", v)}
                    />
                    <ColorPickerField
                      label="Secondary"
                      value={editing?.secondary_color ?? editing?.accent_color ?? "#0d9488"}
                      onChange={(v) => update("secondary_color", v)}
                    />
                    <ColorPickerField
                      label="Tertiary"
                      value={editing?.tertiary_color ?? editing?.accent_color ?? "#0d9488"}
                      onChange={(v) => update("tertiary_color", v)}
                    />
                    <ColorPickerField
                      label="Text Color"
                      value={editing?.text_color ?? "#ffffff"}
                      onChange={(v) => update("text_color", v)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Card Glass Opacity: {Math.round((editing?.glass_opacity ?? 0.15) * 100)}%</Label>
                    <p className="text-[10px] text-muted-foreground">Controls the frosted-glass overlay darkness</p>
                    <Slider
                      value={[(editing?.glass_opacity ?? 0.15) * 100]}
                      onValueChange={([v]) => update("glass_opacity", v / 100)}
                      min={0}
                      max={80}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Background Blur: {editing?.card_blur ?? 12}px</Label>
                    <p className="text-[10px] text-muted-foreground">Controls the blur intensity on the card background</p>
                    <Slider
                      value={[editing?.card_blur ?? 12]}
                      onValueChange={([v]) => update("card_blur", v)}
                      min={0}
                      max={40}
                      step={1}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Card Background Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isPro ? (
                    <>
                      <ImageUploadField
                        label="Card Face Background"
                        value={editing?.card_bg_image_url ?? null}
                        onChange={(url) => update("card_bg_image_url", url)}
                        folder="card-bg"
                      />

                      {editing?.card_bg_image_url && (
                        <div className="space-y-2">
                          <Label>Image Sizing</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { id: "cover", label: "Stretched", desc: "Fills entire card" },
                              { id: "contain", label: "Fitted", desc: "Fits without cropping" },
                              { id: "center", label: "Centered", desc: "Original size, centered" },
                              { id: "original", label: "Original", desc: "Top-left, no scaling" },
                            ] as const).map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => update("card_bg_size", opt.id)}
                                className={`p-2 rounded-lg border text-xs text-left transition-all ${
                                  (editing?.card_bg_size ?? "cover") === opt.id
                                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                    : "border-border hover:border-primary/40"
                                }`}
                              >
                                <span className="font-medium block">{opt.label}</span>
                                <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Replaces the gradient with your own image or GIF on the card face.
                      </p>
                    </>
                  ) : (
                    <UpgradePrompt feature="Custom Card Backgrounds" description="Upload your own images and GIFs for the card face with Pro." />
                  )}
                </CardContent>
              </Card>

              {/* Card Texture Presets — Enhanced */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Card Texture
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground">Apply a subtle surface pattern to your card</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {CARD_TEXTURE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => update("card_texture", preset.id)}
                        className={`relative rounded-xl border-2 text-xs text-center transition-all overflow-hidden ${
                          editing?.card_texture === preset.id
                            ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                            : "border-border hover:border-primary/50 hover:shadow-md"
                        }`}
                      >
                        <div
                          className="h-20 w-full"
                          style={{
                            backgroundImage: preset.css !== "none" ? preset.css : undefined,
                            backgroundSize: "backgroundSize" in preset ? preset.backgroundSize : undefined,
                            backgroundColor: "#1a1a2e",
                          }}
                        />
                        <div className="p-2 bg-card/80 backdrop-blur-sm">
                          <span className="font-medium">{preset.label}</span>
                        </div>
                        {editing?.card_texture === preset.id && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] text-primary-foreground">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Typography on Card */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Card Typography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select value={editing?.font_family ?? "Space Grotesk"} onValueChange={(v) => update("font_family", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_PRESETS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span style={{ fontFamily: f.stack }}>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Text Placement</Label>
                    <div className="flex gap-2">
                      {TEXT_ALIGNMENTS.map((a) => {
                        const Icon = a.icon;
                        return (
                          <button
                            key={a.id}
                            onClick={() => update("text_alignment", a.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors ${
                              (editing?.text_alignment ?? "left") === a.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Landing Page Tab ── */}
            <TabsContent value="landing" className="space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Landing Page Background</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPickerField
                    label="Background Color"
                    value={editing?.landing_bg_color ?? "#0a0a0f"}
                    onChange={(v) => update("landing_bg_color", v)}
                  />

                  <Separator />

                  <div className="space-y-2">
                    <Label>Background Preset Overlay</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">Choose a decorative pattern overlay for your landing page</p>
                    <div className="grid grid-cols-2 gap-3">
                      {BACKGROUND_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => update("background_preset", preset.id)}
                          className={`relative rounded-xl border-2 text-xs text-center transition-all overflow-hidden ${
                            editing?.background_preset === preset.id
                              ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                              : "border-border hover:border-primary/50 hover:shadow-md"
                          }`}
                        >
                          <div
                            className="h-20 w-full"
                            style={{
                              backgroundImage: preset.css !== "none" ? preset.css : undefined,
                              backgroundColor: editing?.landing_bg_color ?? "#0a0a0f",
                            }}
                          />
                          <div className="p-2 bg-card/80 backdrop-blur-sm">
                            <span className="font-medium">{preset.label}</span>
                          </div>
                          {editing?.background_preset === preset.id && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-[10px] text-primary-foreground">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <ImageUploadField
                    label="Background Image"
                    value={editing?.background_image_url ?? null}
                    onChange={(url) => update("background_image_url", url)}
                    folder="landing-bg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Overrides the color & preset with a full-bleed background image.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Identity Tab ── */}
            <TabsContent value="identity" className="space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Profile Info</CardTitle>
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

              {/* CV / Resume Upload */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <FileText className="w-4 h-4" /> CV / Resume
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground">Optional — appears as a download button on your landing page</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editing?.cv_url ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs truncate max-w-[200px]">
                        {editing.cv_url.split("/").pop()}
                      </Badge>
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => update("cv_url", null)}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No CV uploaded yet</p>
                  )}
                  <ImageUploadField
                    label="Upload CV (PDF or image)"
                    value={editing?.cv_url ?? null}
                    onChange={(url) => update("cv_url", url)}
                    folder="cv-uploads"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* RIGHT: Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-display font-semibold">Live Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button size="sm" variant={deviceMode === "desktop" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setDeviceMode("desktop")}>
                  <Monitor className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant={deviceMode === "mobile" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setDeviceMode("mobile")}>
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
                  backgroundColor: editing?.landing_bg_color ?? "hsl(var(--background))",
                  backgroundImage: editing?.background_image_url
                    ? `url(${editing.background_image_url})`
                    : presetCss !== "none"
                    ? presetCss
                    : undefined,
                  backgroundSize: editing?.background_image_url ? "cover" : undefined,
                  backgroundPosition: editing?.background_image_url ? "center" : undefined,
                }}
              >
                <div className="relative flex flex-col items-center justify-center min-h-[400px] p-6">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${editing?.accent_color ?? "#0d9488"}15, transparent 70%)`,
                    }}
                  />

                  <div className="flex items-center gap-2 absolute top-4">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: editing?.accent_color ?? "#0d9488" }}>
                      <span className="text-[8px] font-bold" style={{ color: editing?.text_color ?? "#fff" }}>N</span>
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

                  <div className="w-full max-w-sm space-y-3 mt-6 opacity-60">
                    <div className="text-center">
                      <h2 className="text-sm font-display font-bold">{editing?.display_name || "Your Name"}</h2>
                      {editing?.headline && <p className="text-[10px] text-muted-foreground">{editing.headline}</p>}
                    </div>
                    {editing?.bio && (
                      <div className="glass-card rounded-lg p-2 text-[10px] leading-relaxed">
                        {editing.bio}
                      </div>
                    )}
                    <Button size="sm" className="w-full text-xs" style={{ background: editing?.accent_color ?? "#0d9488", color: editing?.text_color ?? "#fff" }}>
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
