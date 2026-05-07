import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FIELD_GROUPS = [
  {
    id: "colors", label: "Colors",
    desc: "Accent, secondary, tertiary, text & landing background",
    fields: ["accent_color", "secondary_color", "tertiary_color", "text_color", "landing_bg_color"],
  },
  {
    id: "typography", label: "Typography",
    desc: "Font family & text alignment",
    fields: ["font_family", "text_alignment"],
  },
  {
    id: "background", label: "Page background",
    desc: "Preset, image & image position",
    fields: ["background_preset", "background_image_url", "bg_image_position"],
  },
  {
    id: "card", label: "Card design",
    desc: "Card bg image, blur, opacity, texture, radius, shadow, animation",
    fields: ["card_bg_image_url", "card_bg_size", "card_bg_position", "card_blur", "glass_opacity", "card_texture", "border_radius", "shadow_preset", "card_animation"],
  },
  {
    id: "theme", label: "Page theme",
    desc: "Page builder theme preset",
    fields: ["page_theme"],
  },
] as const;

type GroupId = typeof FIELD_GROUPS[number]["id"];

interface CopyDesignDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: any | null;
  targets: { id: string; label: string }[];
  onDone: () => void;
}

export function CopyDesignDialog({ open, onOpenChange, source, targets, onDone }: CopyDesignDialogProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Set<GroupId>>(new Set(["colors", "typography", "card"]));
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleGroup = (id: GroupId) => {
    setGroups((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleTarget = (id: string) => {
    setTargetIds((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleApply = async () => {
    if (!source || targetIds.size === 0 || groups.size === 0) return;
    setSaving(true);
    const payload: Record<string, any> = {};
    FIELD_GROUPS.filter((g) => groups.has(g.id)).forEach((g) =>
      g.fields.forEach((f) => { payload[f] = (source as any)[f] ?? null; })
    );
    const ids = Array.from(targetIds);
    const { error } = await supabase.from("personas").update(payload as any).in("id", ids);
    setSaving(false);
    if (error) {
      toast({ title: "Copy failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Design copied", description: `Applied to ${ids.length} persona${ids.length > 1 ? "s" : ""}.` });
      onDone();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="w-4 h-4" /> Copy design
          </DialogTitle>
          <DialogDescription>
            From <strong>{source?.label ?? "—"}</strong>, copy selected design fields to other personas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-eyebrow text-muted-foreground mb-2">What to copy</p>
            <div className="space-y-2">
              {FIELD_GROUPS.map((g) => (
                <label key={g.id} className="flex items-start gap-2.5 p-2.5 rounded-sm border border-border hover:border-accent/40 cursor-pointer">
                  <Checkbox checked={groups.has(g.id)} onCheckedChange={() => toggleGroup(g.id)} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-eyebrow text-muted-foreground mb-2">Apply to</p>
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other personas to copy to.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {targets.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-border hover:border-accent/40 cursor-pointer">
                    <Checkbox checked={targetIds.has(t.id)} onCheckedChange={() => toggleTarget(t.id)} />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="rounded-sm"
              disabled={saving || targetIds.size === 0 || groups.size === 0}
              onClick={handleApply}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { FIELD_GROUPS };
