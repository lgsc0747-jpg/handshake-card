export const CARD_TEXTURE_PRESETS = [
  { id: "none", label: "None", css: "none" },
  {
    id: "carbon-fiber",
    label: "Carbon Fiber",
    css: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
  },
  {
    id: "brushed-metal",
    label: "Brushed Metal",
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.02) 4px)",
  },
  {
    id: "linen",
    label: "Linen",
    css: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px)",
  },
  {
    id: "noise-grain",
    label: "Film Grain",
    css: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
  },
  {
    id: "diagonal-lines",
    label: "Diagonal Lines",
    css: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px)",
  },
  {
    id: "dots",
    label: "Dot Matrix",
    css: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
    backgroundSize: "8px 8px",
  },
  {
    id: "honeycomb",
    label: "Honeycomb",
    css: "radial-gradient(circle farthest-side at 0% 50%, rgba(255,255,255,0.04) 23.5%, transparent 0) 14px 28px, radial-gradient(circle farthest-side at 0% 50%, rgba(255,255,255,0.03) 24%, transparent 0) 14px 0",
    backgroundSize: "28px 56px",
  },
] as const;

export type CardTextureId = (typeof CARD_TEXTURE_PRESETS)[number]["id"];

export function getTextureCss(id: string | null | undefined): { backgroundImage: string; backgroundSize?: string } | null {
  const preset = CARD_TEXTURE_PRESETS.find((p) => p.id === id);
  if (!preset || preset.css === "none") return null;
  return {
    backgroundImage: preset.css,
    backgroundSize: "backgroundSize" in preset ? preset.backgroundSize : undefined,
  };
}
