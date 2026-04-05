export const FONT_PRESETS = [
  { id: "Space Grotesk", label: "Space Grotesk", stack: "'Space Grotesk', sans-serif" },
  { id: "Inter", label: "Inter", stack: "'Inter', sans-serif" },
  { id: "system-ui", label: "System UI", stack: "system-ui, -apple-system, sans-serif" },
  { id: "Georgia", label: "Georgia (Serif)", stack: "Georgia, 'Times New Roman', serif" },
  { id: "monospace", label: "Monospace", stack: "'SF Mono', 'Fira Code', 'Courier New', monospace" },
  { id: "Playfair Display", label: "Playfair Display", stack: "'Playfair Display', serif" },
  { id: "Roboto Slab", label: "Roboto Slab", stack: "'Roboto Slab', serif" },
] as const;

export type FontPresetId = (typeof FONT_PRESETS)[number]["id"];

export function getFontStack(id: string | null | undefined): string {
  return FONT_PRESETS.find((p) => p.id === id)?.stack ?? "'Space Grotesk', sans-serif";
}

/** Google Fonts link for fonts that need loading */
export function getGoogleFontUrl(id: string | null | undefined): string | null {
  const needsGoogleFont: Record<string, string> = {
    "Inter": "Inter:wght@400;500;600;700",
    "Playfair Display": "Playfair+Display:wght@400;600;700",
    "Roboto Slab": "Roboto+Slab:wght@400;500;600;700",
  };
  if (!id || !needsGoogleFont[id]) return null;
  return `https://fonts.googleapis.com/css2?family=${needsGoogleFont[id]}&display=swap`;
}
