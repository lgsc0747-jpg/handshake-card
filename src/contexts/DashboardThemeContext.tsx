import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardTheme =
  | "light" | "dark"
  | "midnight" | "slate" | "emerald" | "cyberpunk"
  | "serika" | "botanical" | "olivia" | "carbon"
  | "monokai" | "aurora" | "dracula" | "terminal";

export type ColorMode = "dark" | "light" | "system";

interface ThemeConfig {
  label: string;
  description: string;
  preview: string;
  secondary: string;
}

export const DASHBOARD_THEMES: Record<DashboardTheme, ThemeConfig> = {
  midnight: {
    label: "Midnight",
    description: "Deep blue-black with cool accents",
    preview: "#3b82f6",
    secondary: "#6366f1",
  },
  slate: {
    label: "Slate",
    description: "Neutral gray, clean and modern",
    preview: "#64748b",
    secondary: "#94a3b8",
  },
  emerald: {
    label: "Emerald",
    description: "Rich dark green tones",
    preview: "#10b981",
    secondary: "#14b8a6",
  },
  cyberpunk: {
    label: "Cyberpunk",
    description: "Neon high-contrast with magenta",
    preview: "#e879f9",
    secondary: "#f472b6",
  },
  serika: {
    label: "Serika Dark",
    description: "Warm yellow on charcoal",
    preview: "#e2b714",
    secondary: "#646669",
  },
  botanical: {
    label: "Botanical",
    description: "Earthy sage green on dark olive",
    preview: "#7b9e6b",
    secondary: "#c4a882",
  },
  olivia: {
    label: "Olivia",
    description: "Soft pink on deep mauve",
    preview: "#e8a0bf",
    secondary: "#957dad",
  },
  carbon: {
    label: "Carbon",
    description: "Pure minimal gray on black",
    preview: "#f5f5f5",
    secondary: "#666666",
  },
  monokai: {
    label: "Monokai",
    description: "Classic code-editor palette",
    preview: "#f92672",
    secondary: "#a6e22e",
  },
  aurora: {
    label: "Aurora",
    description: "Northern lights teal and violet",
    preview: "#88c0d0",
    secondary: "#b48ead",
  },
  dracula: {
    label: "Dracula",
    description: "Purple accents on dark charcoal",
    preview: "#bd93f9",
    secondary: "#ff79c6",
  },
  terminal: {
    label: "Terminal",
    description: "Hacker green on pure black",
    preview: "#00ff41",
    secondary: "#008f11",
  },
};

interface Ctx {
  theme: DashboardTheme;
  setTheme: (t: DashboardTheme) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  resolvedColorMode: "dark" | "light";
}

const DashboardThemeContext = createContext<Ctx>({
  theme: "midnight",
  setTheme: () => {},
  colorMode: "system",
  setColorMode: () => {},
  resolvedColorMode: "dark",
});

const STORAGE_KEY = "admin_theme";
const COLOR_MODE_KEY = "admin_color_mode";

function getSystemPreference(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DASHBOARD_THEMES) return stored as DashboardTheme;
    return "midnight";
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem(COLOR_MODE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  });

  const [systemPref, setSystemPref] = useState<"dark" | "light">(getSystemPreference);

  const resolvedColorMode: "dark" | "light" = colorMode === "system" ? systemPref : colorMode;

  const setTheme = (t: DashboardTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  const setColorMode = (m: ColorMode) => {
    setColorModeState(m);
    localStorage.setItem(COLOR_MODE_KEY, m);
  };

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.keys(DASHBOARD_THEMES).forEach((k) => root.classList.remove(`theme-${k}`));
    root.classList.add(`theme-${theme}`);

    if (resolvedColorMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    return () => {
      root.classList.remove(`theme-${theme}`);
    };
  }, [theme, resolvedColorMode]);

  return (
    <DashboardThemeContext.Provider value={{ theme, setTheme, colorMode, setColorMode, resolvedColorMode }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => useContext(DashboardThemeContext);
