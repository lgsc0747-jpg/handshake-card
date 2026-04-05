import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Check, Edit3, Shield, Lock, Users, Loader2,
  Palette, Image as ImageIcon, Eye,
} from "lucide-react";

const BACKGROUND_PRESETS = [
  { id: "default", label: "Default", css: "none" },
  { id: "carbon", label: "Carbon Fiber", css: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 6px)" },
  { id: "mesh", label: "Mesh Gradient", css: "radial-gradient(at 40% 20%, hsla(178,80%,40%,0.3) 0px, transparent 50%), radial-gradient(at 80% 60%, hsla(280,60%,50%,0.2) 0px, transparent 50%)" },
  { id: "cyberpunk", label: "Cyberpunk Grid", css: "linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)" },
  { id: "marble", label: "Minimalist Marble", css: "linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.05) 25%, transparent 25%)" },
  { id: "holo", label: "Holographic", css: "linear-gradient(135deg, rgba(255,0,128,0.15), rgba(0,255,255,0.15), rgba(128,0,255,0.15))" },
];

interface Persona {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  is_private: boolean;
  pin_code: string | null;
  require_contact_exchange: boolean;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  email_public: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  cv_url: string | null;
  accent_color: string | null;
  background_preset: string | null;
  background_image_url: string | null;
  glass_opacity: number | null;
  availability_status: string | null;
  work_mode: string | null;
  show_availability: boolean | null;
  show_location: boolean | null;
}

const PersonasPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits, isPro } = useSubscription();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPersonas = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setPersonas((data as Persona[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    const count = personas.length;
    if (count >= limits.maxPersonas) {
      toast({ title: "Persona limit reached", description: "Upgrade to Pro for unlimited personas.", variant: "destructive" });
      return;
    }
    const slug = `persona-${count + 1}`;
    const { data, error } = await supabase
      .from("personas")
      .insert({
        user_id: user.id,
        slug,
        label: `Persona ${count + 1}`,
        is_active: count === 0,
        display_name: user.user_metadata?.full_name || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPersonas([...personas, data as Persona]);
      setEditingPersona(data as Persona);
      setShowEditor(true);
      toast({ title: "Persona created", description: "Customize your new identity." });
    }
  };

  const handleSetActive = async (persona: Persona) => {
    if (!user) return;
    // Deactivate all, then activate this one
    await supabase
      .from("personas")
      .update({ is_active: false })
      .eq("user_id", user.id);
    await supabase
      .from("personas")
      .update({ is_active: true })
      .eq("id", persona.id);
    setPersonas(
      personas.map((p) => ({ ...p, is_active: p.id === persona.id }))
    );
    toast({ title: "Active persona updated", description: `"${persona.label}" is now live on your NFC card.` });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("personas").delete().eq("id", id);
    setPersonas(personas.filter((p) => p.id !== id));
    toast({ title: "Persona deleted" });
  };

  const handleSave = async () => {
    if (!editingPersona) return;
    setSaving(true);
    const { id, ...rest } = editingPersona;
    // Remove fields that aren't columns
    const updateData: Record<string, unknown> = { ...rest };
    delete (updateData as Record<string, unknown>).id;

    const { error } = await supabase
      .from("personas")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPersonas(personas.map((p) => (p.id === id ? editingPersona : p)));
      toast({ title: "Persona saved" });
    }
    setSaving(false);
  };

  const updateField = (field: keyof Persona, value: unknown) => {
    if (!editingPersona) return;
    setEditingPersona({ ...editingPersona, [field]: value });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Persona Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage unlimited identities for your NFC card
            </p>
          </div>
          <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1.5" /> New Persona
          </Button>
        </div>

        {personas.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Create your first persona to get started. Each persona can have its own identity, socials, and visual style.
              </p>
              <Button onClick={handleCreate} className="mt-4 gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1.5" /> Create Persona
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <Card
                key={persona.id}
                className="glass-card animate-fade-in group relative overflow-hidden"
                style={{
                  borderColor: persona.is_active ? persona.accent_color ?? undefined : undefined,
                  borderWidth: persona.is_active ? 2 : undefined,
                }}
              >
                {/* Accent bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: persona.accent_color ?? "hsl(var(--primary))" }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-base">{persona.label}</CardTitle>
                    <div className="flex items-center gap-1">
                      {persona.is_active && (
                        <Badge className="text-[10px] gradient-primary text-primary-foreground border-0">
                          Active
                        </Badge>
                      )}
                      {persona.is_private && (
                        <Badge variant="outline" className="text-[10px]">
                          <Lock className="w-3 h-3 mr-0.5" /> Private
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{persona.display_name || "Unnamed"}</p>
                    <p className="text-xs truncate">{persona.headline || "No headline"}</p>
                    <p className="text-xs font-mono text-primary mt-1">/p/{user?.user_metadata?.username || "you"}/{persona.slug}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!persona.is_active && (
                      <Button size="sm" variant="outline" onClick={() => handleSetActive(persona)}>
                        <Check className="w-3 h-3 mr-1" /> Set Active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPersona({ ...persona });
                        setShowEditor(true);
                      }}
                    >
                      <Edit3 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(persona.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Persona</DialogTitle>
          </DialogHeader>
          {editingPersona && (
            <div className="space-y-6">
              {/* Identity */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input value={editingPersona.label} onChange={(e) => updateField("label", e.target.value)} placeholder="e.g. Work, Social" />
                  </div>
                  <div className="space-y-1">
                    <Label>Slug (URL path)</Label>
                    <Input value={editingPersona.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Display Name</Label>
                    <Input value={editingPersona.display_name ?? ""} onChange={(e) => updateField("display_name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Headline</Label>
                    <Input value={editingPersona.headline ?? ""} onChange={(e) => updateField("headline", e.target.value)} placeholder="Full-Stack Developer" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Bio</Label>
                    <Input value={editingPersona.bio ?? ""} onChange={(e) => updateField("bio", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact & Socials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={editingPersona.email_public ?? ""} onChange={(e) => updateField("email_public", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={editingPersona.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input value={editingPersona.location ?? ""} onChange={(e) => updateField("location", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Website</Label>
                    <Input value={editingPersona.website ?? ""} onChange={(e) => updateField("website", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>LinkedIn</Label>
                    <Input value={editingPersona.linkedin_url ?? ""} onChange={(e) => updateField("linkedin_url", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>GitHub</Label>
                    <Input value={editingPersona.github_url ?? ""} onChange={(e) => updateField("github_url", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Design */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Design Studio
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingPersona.accent_color ?? "#0d9488"}
                        onChange={(e) => updateField("accent_color", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                      />
                      <Input
                        value={editingPersona.accent_color ?? "#0d9488"}
                        onChange={(e) => updateField("accent_color", e.target.value)}
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
                          onClick={() => updateField("background_preset", preset.id)}
                          className={`p-3 rounded-lg border text-xs text-center transition-colors ${
                            editingPersona.background_preset === preset.id
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
                    <Label>Glass Opacity: {Math.round((editingPersona.glass_opacity ?? 0.15) * 100)}%</Label>
                    <Slider
                      value={[(editingPersona.glass_opacity ?? 0.15) * 100]}
                      onValueChange={([v]) => updateField("glass_opacity", v / 100)}
                      min={0}
                      max={80}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Security — Digital Handshake
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Private Mode</p>
                      <p className="text-xs text-muted-foreground">Visitors must authenticate to view</p>
                    </div>
                    {isPro ? (
                      <Switch
                        checked={editingPersona.is_private}
                        onCheckedChange={(v) => updateField("is_private", v)}
                      />
                    ) : (
                      <UpgradePrompt feature="Private Mode" compact />
                    )}
                  </div>
                  {editingPersona.is_private && (
                    <div className="space-y-3 pl-4 border-l-2 border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Require Contact Exchange</p>
                          <p className="text-xs text-muted-foreground">Visitors share their info to unlock</p>
                        </div>
                        <Switch
                          checked={editingPersona.require_contact_exchange}
                          onCheckedChange={(v) => updateField("require_contact_exchange", v)}
                        />
                      </div>
                      {!editingPersona.require_contact_exchange && (
                        <div className="space-y-1">
                          <Label>PIN Code (4 digits)</Label>
                          <Input
                            value={editingPersona.pin_code ?? ""}
                            onChange={(e) => updateField("pin_code", e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="1234"
                            maxLength={4}
                            className="w-32 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
                <Button onClick={handleSave} className="gradient-primary text-primary-foreground" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                  Save Persona
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PersonasPage;
