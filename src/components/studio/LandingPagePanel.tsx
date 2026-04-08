import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ColorPickerField } from "@/components/DesignStudio/ColorPickerField";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { BACKGROUND_PRESETS } from "@/components/DesignStudio/BackgroundPresets";
import type { StudioPanelProps } from "./CardDesignPanel";

const posToFit = (pos: { x: number; y: number; scale: number } | null) => ({
  objectFit: "cover" as const,
  objectPosition: `${pos?.x ?? 50}% ${pos?.y ?? 50}%`,
  scale: pos?.scale ?? 100,
});

export function LandingPagePanel({ editing, update, isPro }: StudioPanelProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Background</h3>
        <ColorPickerField
          label="Background Color"
          value={editing?.landing_bg_color ?? "#0a0a0f"}
          onChange={(v) => update("landing_bg_color", v)}
        />
      </section>

      <Separator className="opacity-40" />

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Pattern Overlay</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => update("background_preset", preset.id)}
              className={`relative rounded-xl border-2 text-xs text-center transition-all overflow-hidden ${
                editing?.background_preset === preset.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className="h-16 w-full"
                style={{
                  backgroundImage: preset.css !== "none" ? preset.css : undefined,
                  backgroundColor: editing?.landing_bg_color ?? "#0a0a0f",
                }}
              />
              <div className="p-1.5 bg-card/80 backdrop-blur-sm">
                <span className="font-medium text-[10px]">{preset.label}</span>
              </div>
              {editing?.background_preset === preset.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <Separator className="opacity-40" />

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Background Image</h3>
        {isPro ? (
          <>
            <ImageUploadField
              label="Full-bleed Background"
              value={editing?.background_image_url ?? null}
              onChange={(url) => update("background_image_url", url)}
              folder="landing-bg"
              imageFit={posToFit(editing?.bg_image_position)}
              onFitChange={(fit) => {
                const parts = fit.objectPosition.split(" ");
                update("bg_image_position", {
                  x: parseInt(parts[0]) || 50,
                  y: parseInt(parts[1]) || 50,
                  scale: fit.scale,
                });
              }}
              cropAspectRatio={9 / 16}
              cropLabel="Landing Page Background"
            />
            <p className="text-[10px] text-muted-foreground">
              Overrides the color & pattern with a custom image.
            </p>
          </>
        ) : (
          <UpgradePrompt feature="Custom Background" description="Upload your own background images with Pro." />
        )}
      </section>
    </div>
  );
}
