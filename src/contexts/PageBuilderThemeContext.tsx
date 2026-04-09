import { createContext, useContext, useState, type ReactNode } from "react";

export interface PageTheme {
  id: string;
  label: string;
  description: string;
  preview: string; // swatch color
  type: "color" | "layout";
  vars: Record<string, string>; // CSS custom properties
}

export const PAGE_THEMES: PageTheme[] = [
  // ── Color Scheme Presets ──
  {
    id: "default",
    label: "Default",
    description: "Uses your persona colors",
    preview: "#0d9488",
    type: "color",
    vars: {},
  },
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    description: "Deep navy with cyan accents",
    preview: "#1e3a5f",
    type: "color",
    vars: {
      "--page-bg": "#0b1120",
      "--page-surface": "#111b2e",
      "--page-text": "#e2e8f0",
      "--page-text-muted": "#94a3b8",
      "--page-accent": "#22d3ee",
      "--page-accent-soft": "rgba(34,211,238,0.15)",
      "--page-border": "rgba(148,163,184,0.15)",
      "--page-card-bg": "rgba(17,27,46,0.8)",
    },
  },
  {
    id: "warm-sand",
    label: "Warm Sand",
    description: "Earthy beige with terracotta",
    preview: "#d4a574",
    type: "color",
    vars: {
      "--page-bg": "#faf5ef",
      "--page-surface": "#f5ebe0",
      "--page-text": "#3d2c1e",
      "--page-text-muted": "#8b7355",
      "--page-accent": "#c2703e",
      "--page-accent-soft": "rgba(194,112,62,0.12)",
      "--page-border": "rgba(139,115,85,0.2)",
      "--page-card-bg": "rgba(245,235,224,0.9)",
    },
  },
  {
    id: "neon-noir",
    label: "Neon Noir",
    description: "Pure black with neon magenta",
    preview: "#ff2d95",
    type: "color",
    vars: {
      "--page-bg": "#000000",
      "--page-surface": "#0a0a0a",
      "--page-text": "#ffffff",
      "--page-text-muted": "#888888",
      "--page-accent": "#ff2d95",
      "--page-accent-soft": "rgba(255,45,149,0.15)",
      "--page-border": "rgba(255,255,255,0.08)",
      "--page-card-bg": "rgba(15,15,15,0.9)",
    },
  },
  {
    id: "pastel-dream",
    label: "Pastel Dream",
    description: "Soft lavender & pink pastels",
    preview: "#c4b5fd",
    type: "color",
    vars: {
      "--page-bg": "#faf5ff",
      "--page-surface": "#f3e8ff",
      "--page-text": "#3b0764",
      "--page-text-muted": "#7c3aed",
      "--page-accent": "#a855f7",
      "--page-accent-soft": "rgba(168,85,247,0.12)",
      "--page-border": "rgba(124,58,237,0.15)",
      "--page-card-bg": "rgba(243,232,255,0.8)",
    },
  },
  {
    id: "forest",
    label: "Forest",
    description: "Deep green with gold highlights",
    preview: "#166534",
    type: "color",
    vars: {
      "--page-bg": "#052e16",
      "--page-surface": "#0a3d21",
      "--page-text": "#dcfce7",
      "--page-text-muted": "#86efac",
      "--page-accent": "#fbbf24",
      "--page-accent-soft": "rgba(251,191,36,0.15)",
      "--page-border": "rgba(134,239,172,0.12)",
      "--page-card-bg": "rgba(10,61,33,0.8)",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool blues and aqua tones",
    preview: "#0ea5e9",
    type: "color",
    vars: {
      "--page-bg": "#0c1929",
      "--page-surface": "#0f2942",
      "--page-text": "#e0f2fe",
      "--page-text-muted": "#7dd3fc",
      "--page-accent": "#0ea5e9",
      "--page-accent-soft": "rgba(14,165,233,0.15)",
      "--page-border": "rgba(125,211,252,0.12)",
      "--page-card-bg": "rgba(15,41,66,0.8)",
    },
  },
  {
    id: "rose-gold",
    label: "Rosé Gold",
    description: "Warm pink and gold luxe",
    preview: "#f9a8d4",
    type: "color",
    vars: {
      "--page-bg": "#1a0a10",
      "--page-surface": "#2a1520",
      "--page-text": "#fce7f3",
      "--page-text-muted": "#f9a8d4",
      "--page-accent": "#f472b6",
      "--page-accent-soft": "rgba(244,114,182,0.15)",
      "--page-border": "rgba(249,168,212,0.1)",
      "--page-card-bg": "rgba(42,21,32,0.8)",
    },
  },
  // ── Full Layout Themes ──
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean white, tight spacing, system font",
    preview: "#ffffff",
    type: "layout",
    vars: {
      "--page-bg": "#ffffff",
      "--page-surface": "#fafafa",
      "--page-text": "#171717",
      "--page-text-muted": "#737373",
      "--page-accent": "#171717",
      "--page-accent-soft": "rgba(23,23,23,0.08)",
      "--page-border": "rgba(0,0,0,0.08)",
      "--page-card-bg": "#ffffff",
      "--page-radius": "8px",
      "--page-font": "'Inter', system-ui, sans-serif",
      "--page-spacing": "0.75",
    },
  },
  {
    id: "bold",
    label: "Bold",
    description: "Large type, strong contrasts",
    preview: "#ef4444",
    type: "layout",
    vars: {
      "--page-bg": "#09090b",
      "--page-surface": "#18181b",
      "--page-text": "#fafafa",
      "--page-text-muted": "#a1a1aa",
      "--page-accent": "#ef4444",
      "--page-accent-soft": "rgba(239,68,68,0.15)",
      "--page-border": "rgba(255,255,255,0.08)",
      "--page-card-bg": "rgba(24,24,27,0.9)",
      "--page-radius": "16px",
      "--page-font": "'Space Grotesk', sans-serif",
      "--page-spacing": "1.25",
    },
  },
  {
    id: "elegant",
    label: "Elegant",
    description: "Serif typography, refined spacing",
    preview: "#92764a",
    type: "layout",
    vars: {
      "--page-bg": "#1a1a1a",
      "--page-surface": "#242424",
      "--page-text": "#f0ece4",
      "--page-text-muted": "#b5a78c",
      "--page-accent": "#c9a96e",
      "--page-accent-soft": "rgba(201,169,110,0.15)",
      "--page-border": "rgba(201,169,110,0.12)",
      "--page-card-bg": "rgba(36,36,36,0.9)",
      "--page-radius": "4px",
      "--page-font": "'Georgia', 'Times New Roman', serif",
      "--page-spacing": "1.1",
    },
  },
  {
    id: "glassmorphism",
    label: "Glass",
    description: "Frosted glass panels, translucent layers",
    preview: "#818cf8",
    type: "layout",
    vars: {
      "--page-bg": "#0f0f23",
      "--page-surface": "rgba(30,30,60,0.5)",
      "--page-text": "#e2e8f0",
      "--page-text-muted": "#94a3b8",
      "--page-accent": "#818cf8",
      "--page-accent-soft": "rgba(129,140,248,0.15)",
      "--page-border": "rgba(255,255,255,0.1)",
      "--page-card-bg": "rgba(30,30,60,0.4)",
      "--page-radius": "20px",
      "--page-font": "'Space Grotesk', sans-serif",
      "--page-spacing": "1",
      "--page-backdrop-blur": "16px",
    },
  },
  {
    id: "brutalist",
    label: "Brutalist",
    description: "Raw, bold borders, monospace",
    preview: "#000000",
    type: "layout",
    vars: {
      "--page-bg": "#fffef5",
      "--page-surface": "#fffef5",
      "--page-text": "#000000",
      "--page-text-muted": "#444444",
      "--page-accent": "#000000",
      "--page-accent-soft": "rgba(0,0,0,0.08)",
      "--page-border": "#000000",
      "--page-card-bg": "#fffef5",
      "--page-radius": "0px",
      "--page-font": "'Courier New', monospace",
      "--page-spacing": "1",
      "--page-border-width": "3px",
    },
  },
];

import { supabase } from "@/integrations/supabase/client";


export function PageThemeProvider({ children, initialPersonaId, initialThemeId }: { children: ReactNode; initialPersonaId?: string | null; initialThemeId?: string }) {
  const [personaId, setPersonaId] = useState<string | null>(initialPersonaId ?? null);
  const [themeId, setThemeIdState] = useState<string>(initialThemeId ?? "default");

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    // Persist to DB
    if (personaId) {
      supabase.from("personas").update({ page_theme: id } as any).eq("id", personaId).then(() => {});
    }
  };

  const handleSetPersonaId = (id: string | null) => {
    setPersonaId(id);
    if (id) {
      // Load theme from DB
      supabase.from("personas").select("page_theme").eq("id", id).single().then(({ data }) => {
        setThemeIdState((data as any)?.page_theme ?? "default");
      });
    } else {
      setThemeIdState("default");
    }
  };

  const theme = PAGE_THEMES.find(t => t.id === themeId) || PAGE_THEMES[0];

  return (
    <PageThemeContext.Provider value={{ themeId, theme, setThemeId, personaId, setPersonaId: handleSetPersonaId }}>
      {children}
    </PageThemeContext.Provider>
  );
}

export const usePageTheme = () => useContext(PageThemeContext);

/** Generates inline style object from a PageTheme's CSS vars */
export function getPageThemeStyles(themeId: string): React.CSSProperties {
  const theme = PAGE_THEMES.find(t => t.id === themeId) || PAGE_THEMES[0];
  if (!theme.vars || Object.keys(theme.vars).length === 0) return {};
  const style: Record<string, string> = {};
  Object.entries(theme.vars).forEach(([k, v]) => {
    style[k] = v;
  });
  return style as React.CSSProperties;
}

/** CSS class that makes children consume page theme vars */
export const PAGE_THEME_CLASS = "page-themed";
