import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DashboardTheme = "midnight" | "slate" | "emerald" | "cyberpunk";

interface ThemeConfig {
  label: string;
  description: string;
  preview: string; // accent hex for UI preview swatch
}

export const DASHBOARD_THEMES: Record<DashboardTheme, ThemeConfig> = {
  midnight: {
    label: "Midnight",
    description: "Deep blue-black with cool accents",
    preview: "#3b82f6",
  },
  slate: {
    label: "Slate",
    description: "Neutral gray, clean and modern",
    preview: "#64748b",
  },
  emerald: {
    label: "Emerald",
    description: "Rich dark green tones",
    preview: "#10b981",
  },
  cyberpunk: {
    label: "Cyberpunk",
    description: "Neon high-contrast with magenta",
    preview: "#e879f9",
  },
};

interface Ctx {
  theme: DashboardTheme;
  setTheme: (t: DashboardTheme) => void;
}

const DashboardThemeContext = createContext<Ctx>({
  theme: "midnight",
  setTheme: () => {},
});

const STORAGE_KEY = "admin_theme";

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DASHBOARD_THEMES) return stored as DashboardTheme;
    return "midnight";
  });

  const setTheme = (t: DashboardTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes, then add current
    Object.keys(DASHBOARD_THEMES).forEach((k) => root.classList.remove(`theme-${k}`));
    root.classList.add(`theme-${theme}`);
    // Always keep dark class for the dashboard
    root.classList.add("dark");
    return () => {
      root.classList.remove(`theme-${theme}`);
    };
  }, [theme]);

  return (
    <DashboardThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => useContext(DashboardThemeContext);
