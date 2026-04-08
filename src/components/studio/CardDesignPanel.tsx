import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPickerField } from "@/components/DesignStudio/ColorPickerField";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { CARD_TEXTURE_PRESETS } from "@/components/DesignStudio/CardTexturePresets";
import { FONT_PRESETS } from "@/components/DesignStudio/FontPresets";
import type { PersonaDesign } from "@/components/DesignStudio/types";
import { AlignLeft, AlignCenter, AlignRight, RectangleHorizontal, Square, Circle, Sparkles, RotateCcw, Zap, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_ALIGNMENTS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
];

const IMAGE_SIZING = [
  { id: "cover", label: "Stretched", desc: "Fills entire card" },
  { id: "contain", label: "Fitted", desc: "Fits without cropping" },
  { id: "center", label: "Centered", desc: "Original size, centered" },
  { id: "original", label: "Original", desc: "Top-left, no scaling" },
] as const;

const SHADOW_PRESETS = [
  { id: "none", label: "None", css: "none" },
  { id: "subtle", label: "Subtle", css: "0 4px 12px -2px rgba(0,0,0,0.15)" },
  { id: "medium", label: "Medium", css: "0 8px 24px -4px rgba(0,0,0,0.25)" },
  { id: "strong", label: "Strong", css: "0 16px 48px -8px rgba(0,0,0,0.4)" },
  { id: "glow", label: "Glow", css: "0 0 30px -5px var(--accent)" },
  { id: "neon", label: "Neon", css: "0 0 20px 0 var(--accent), 0 0 40px 0 var(--accent)" },
];

const CARD_ANIMATIONS = [
  { id: "tilt", label: "3D Tilt", desc: "Follows cursor", icon: MousePointer },
  { id: "float", label: "Float", desc: "Gentle hover", icon: Sparkles },
  { id: "flip", label: "Flip", desc: "Card flip on click", icon: RotateCcw },
  { id: "pulse", label: "Pulse", desc: "Breathing glow", icon: Zap },
  { id: "none", label: "Static", desc: "No animation", icon: Square },
];

export interface StudioPanelProps {
  editing: PersonaDesign | null;
  update: (field: keyof PersonaDesign, value: unknown) => void;
  isPro: boolean;
}

export function CardDesignPanel({ editing, update, isPro }: StudioPanelProps) {
  return (
    <div className="space-y-6">
      {/* Colors */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Colors</h3>
        <div className="grid grid-cols-2 gap-3">
          <ColorPickerField label="Primary" value={editing?.accent_color ?? "#0d9488"} onChange={(v) => update("accent_color", v)} />
          <ColorPickerField label="Secondary" value={editing?.secondary_color ?? editing?.accent_color ?? "#0d9488"} onChange={(v) => update("secondary_color", v)} />
          <ColorPickerField label="Tertiary" value={editing?.tertiary_color ?? editing?.accent_color ?? "#0d9488"} onChange={(v) => update("tertiary_color", v)} />
          <ColorPickerField label="Text" value={editing?.text_color ?? "#ffffff"} onChange={(v) => update("text_color", v)} />
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Border Radius */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Corner Radius</h3>
        <div className="space-y-2">
          <Label className="text-xs">Roundness · {editing?.border_radius ?? 24}px</Label>
          <Slider
            value={[editing?.border_radius ?? 24]}
            onValueChange={([v]) => update("border_radius", v)}
            min={0} max={48} step={2}
          />
          <div className="flex gap-2 pt-1">
            {[0, 8, 16, 24, 32, 48].map((r) => (
              <button
                key={r}
                onClick={() => update("border_radius", r)}
                className={cn(
                  "w-10 h-10 border-2 transition-all flex items-center justify-center",
                  (editing?.border_radius ?? 24) === r
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                )}
                style={{ borderRadius: `${Math.min(r, 20)}px` }}
              >
                <span className="text-[9px] font-mono text-muted-foreground">{r}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Shadow Presets */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Shadow</h3>
        <div className="grid grid-cols-3 gap-2">
          {SHADOW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => update("shadow_preset", preset.id)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-center transition-all",
                editing?.shadow_preset === preset.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div
                className="w-8 h-5 mx-auto mb-1.5 rounded-md bg-muted-foreground/20"
                style={{
                  boxShadow: preset.css !== "none" ? preset.css.replace(/var\(--accent\)/g, editing?.accent_color ?? "#0d9488") : "none",
                  borderRadius: `${Math.min((editing?.border_radius ?? 24) / 4, 8)}px`,
                }}
              />
              <span className="text-[10px] font-medium">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Card Animation */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Animation</h3>
        <div className="grid grid-cols-2 gap-2">
          {CARD_ANIMATIONS.map((anim) => {
            const Icon = anim.icon;
            return (
              <button
                key={anim.id}
                onClick={() => update("card_animation", anim.id)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
                  (editing?.card_animation ?? "tilt") === anim.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                )}
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="text-xs font-medium block">{anim.label}</span>
                  <span className="text-[10px] text-muted-foreground">{anim.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Glass & Blur */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Effects</h3>
        <div className="space-y-2">
          <Label className="text-xs">Glass Opacity · {Math.round((editing?.glass_opacity ?? 0.15) * 100)}%</Label>
          <Slider value={[(editing?.glass_opacity ?? 0.15) * 100]} onValueChange={([v]) => update("glass_opacity", v / 100)} min={0} max={80} step={5} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Background Blur · {editing?.card_blur ?? 12}px</Label>
          <Slider value={[editing?.card_blur ?? 12]} onValueChange={([v]) => update("card_blur", v)} min={0} max={40} step={1} />
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Background Image */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Card Background</h3>
        {isPro ? (
          <>
            <ImageUploadField
              label="Card Face Image"
              value={editing?.card_bg_image_url ?? null}
              onChange={(url) => update("card_bg_image_url", url)}
              folder="card-bg"
              imageFit={{
                objectFit: "cover",
                objectPosition: `${editing?.card_bg_position?.x ?? 50}% ${editing?.card_bg_position?.y ?? 50}%`,
                scale: editing?.card_bg_position?.scale ?? 100,
              }}
              onFitChange={(fit) => {
                const parts = fit.objectPosition.split(" ");
                update("card_bg_position", {
                  x: parseInt(parts[0]) || 50,
                  y: parseInt(parts[1]) || 50,
                  scale: fit.scale,
                });
              }}
              cropAspectRatio={16 / 10}
              cropLabel="Card Background"
            />
            {editing?.card_bg_image_url && (
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_SIZING.map((opt) => (
                  <button key={opt.id} onClick={() => update("card_bg_size", opt.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs text-left transition-all",
                      (editing?.card_bg_size ?? "cover") === opt.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    )}>
                    <span className="font-medium block">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <UpgradePrompt feature="Custom Card Backgrounds" description="Upload images and GIFs for the card face." />
        )}
      </section>

      <Separator className="opacity-40" />

      {/* Textures */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Surface Texture</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {CARD_TEXTURE_PRESETS.map((preset) => (
            <button key={preset.id} onClick={() => update("card_texture", preset.id)}
              className={cn(
                "relative rounded-xl border-2 text-xs text-center transition-all overflow-hidden",
                editing?.card_texture === preset.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              )}>
              <div className="h-14 w-full" style={{
                backgroundImage: preset.css !== "none" ? preset.css : undefined,
                backgroundSize: "backgroundSize" in preset ? preset.backgroundSize : undefined,
                backgroundColor: "#1a1a2e",
              }} />
              <div className="p-1.5 bg-card/80 backdrop-blur-sm">
                <span className="font-medium text-[10px]">{preset.label}</span>
              </div>
              {editing?.card_texture === preset.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <Separator className="opacity-40" />

      {/* Typography */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Typography</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Font Family {!isPro && <UpgradePrompt feature="Custom Fonts" compact />}</Label>
            <Select value={editing?.font_family ?? "Space Grotesk"} onValueChange={(v) => update("font_family", v)} disabled={!isPro}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_PRESETS.map((f) => (
                  <SelectItem key={f.id} value={f.id}><span style={{ fontFamily: f.stack }}>{f.label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alignment</Label>
            <div className="flex gap-2">
              {TEXT_ALIGNMENTS.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.id} onClick={() => update("text_alignment", a.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs transition-colors",
                      (editing?.text_alignment ?? "left") === a.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    )}>
                    <Icon className="w-3.5 h-3.5" />{a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
