import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePreferences } from "@/contexts/PreferencesContext";

/**
 * Universal color mode. The app only supports light/dark/system —
 * a single, consistent palette across login, dashboard, and page builder.
 */
export type ColorMode = "light" | "dark" | "system";

interface Ctx {
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  resolvedColorMode: "dark" | "light";
  /** @deprecated kept for backward compat — same as resolvedColorMode */
  theme: "light" | "dark";
  /** @deprecated use setColorMode */
  setTheme: (t: "light" | "dark") => void;
}

const DashboardThemeContext = createContext<Ctx>({
  colorMode: "system",
  setColorMode: () => {},
  resolvedColorMode: "dark",
  theme: "dark",
  setTheme: () => {},
});

function getSystemPreference(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const { prefs, setPref } = usePreferences();

  const initialColorMode = (prefs.colorMode ?? "system") as ColorMode;
  const [colorMode, setColorModeState] = useState<ColorMode>(initialColorMode);
  const [systemPref, setSystemPref] = useState<"dark" | "light">(getSystemPreference);

  useEffect(() => {
    if (prefs.colorMode && prefs.colorMode !== colorMode) {
      setColorModeState(prefs.colorMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.colorMode]);

  const resolvedColorMode: "dark" | "light" =
    colorMode === "system" ? systemPref : colorMode;

  const setColorMode = (m: ColorMode) => {
    setColorModeState(m);
    setPref("colorMode", m);
  };

  const setTheme = (t: "light" | "dark") => setColorMode(t);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Strip any legacy theme-* classes from earlier multi-theme system
    Array.from(root.classList).forEach((c) => {
      if (c.startsWith("theme-")) root.classList.remove(c);
    });
    if (resolvedColorMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [resolvedColorMode]);

  return (
    <DashboardThemeContext.Provider
      value={{ colorMode, setColorMode, resolvedColorMode, theme: resolvedColorMode, setTheme }}
    >
      {children}
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => useContext(DashboardThemeContext);
