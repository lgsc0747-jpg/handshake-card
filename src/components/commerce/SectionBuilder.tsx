import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GripVertical, Eye, EyeOff, Plus, Loader2,
  User, ShoppingBag, CreditCard, Mail, Share2,
} from "lucide-react";

const SECTION_TYPES = [
  { id: "hero", label: "Hero / Introduction", icon: User, description: "Name, bio, avatar with big typography" },
  { id: "products", label: "Product Showcase", icon: ShoppingBag, description: "Grid of your products" },
  { id: "nfc_card", label: "3D NFC Card", icon: CreditCard, description: "Interactive digital card" },
  { id: "contact", label: "Contact / Lead Gen", icon: Mail, description: "Contact form and links" },
  { id: "social_grid", label: "Social Grid", icon: Share2, description: "Social media links grid" },
] as const;

export type SectionType = typeof SECTION_TYPES[number]["id"];

export interface PersonaSection {
  id: string;
  persona_id: string;
  user_id: string;
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
}

interface SectionBuilderProps {
  personaId: string;
  onChange?: () => void;
}

export function SectionBuilder({ personaId, onChange }: SectionBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<PersonaSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !personaId) return;
    loadSections();
  }, [user, personaId]);

  const loadSections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("persona_sections")
      .select("*")
      .eq("persona_id", personaId)
      .eq("user_id", user!.id)
      .order("sort_order");

    if (data && data.length > 0) {
      setSections(data.map(d => ({ ...d, config: (d.config as Record<string, unknown>) ?? {} })));
    } else {
      // Initialize with default sections
      const defaults = SECTION_TYPES.map((s, i) => ({
        id: crypto.randomUUID(),
        persona_id: personaId,
        user_id: user!.id,
        section_type: s.id,
        sort_order: i,
        is_visible: s.id !== "products", // products hidden by default for free
        config: {} as Record<string, unknown>,
      }));
      setSections(defaults);
      // Save defaults
      await supabase.from("persona_sections").insert(
        defaults.map(({ id, ...rest }) => ({ ...rest, config: rest.config as any }))
      );
      await loadSections();
    }
    setLoading(false);
  };

  const handleToggle = async (idx: number) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], is_visible: !updated[idx].is_visible };
    setSections(updated);
    await supabase
      .from("persona_sections")
      .update({ is_visible: updated[idx].is_visible })
      .eq("id", updated[idx].id);
    onChange?.();
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...sections];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setSections(updated);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    setSaving(true);
    const updates = sections.map((s, i) => ({ id: s.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from("persona_sections").update({ sort_order: u.sort_order }).eq("id", u.id);
    }
    setSaving(false);
    onChange?.();
    toast({ title: "Section order saved" });
  };

  const getSectionMeta = (type: string) => SECTION_TYPES.find(s => s.id === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="ios-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Page Sections
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Drag to reorder. Toggle visibility.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map((section, idx) => {
          const meta = getSectionMeta(section.section_type);
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                dragIdx === idx
                  ? "border-primary/50 bg-primary/5 scale-[1.02] shadow-lg"
                  : "border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/30"
              } ${!section.is_visible ? "opacity-50" : ""}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{meta.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{meta.description}</p>
              </div>
              <Switch
                checked={section.is_visible}
                onCheckedChange={() => handleToggle(idx)}
                className="shrink-0"
              />
            </div>
          );
        })}
        {saving && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving order...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
