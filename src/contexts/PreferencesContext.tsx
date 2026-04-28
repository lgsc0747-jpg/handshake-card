import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Cloud-synced user preferences.
 *
 * Strategy:
 *  - On mount, hydrate from localStorage (instant, no flash) if present.
 *  - When user logs in, fetch row from `user_preferences` and merge over local cache.
 *  - On every change, update local state + localStorage immediately AND
 *    debounce-push to Supabase (600ms).
 *  - On first cloud sync after a fresh signup, migrate any pre-existing
 *    localStorage keys into the cloud blob.
 *
 * Result: settings persist across browsers, devices, and incognito sessions
 * once the user is authenticated. Anonymous users still get localStorage
 * persistence as a fallback.
 */

export interface AppNotification {
  id: string;
  type: "lead" | "tap" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, any>;
}

export interface NotifPrefs {
  emailLeads: boolean;
  emailTaps: boolean;
  inAppLeads: boolean;
  inAppTaps: boolean;
}

export interface CookiePrefsBlob {
  essential: true;
  analytics: boolean;
  functional: boolean;
  /** True when the user has made a choice (any choice). Banner uses this. */
  decided: boolean;
  decidedAt?: string;
}

/** The full preferences blob. Add new keys here, then read/write via `prefs.<key>`. */
export interface PrefsBlob {
  // Theme
  theme?: string;
  colorMode?: "light" | "dark" | "system";

  // Dashboard
  dashEngagementOrder?: string[];
  dashTechnicalOrder?: string[];
  dashSecurityOrder?: string[];
  dashChartVisibility?: Record<string, boolean>;
  dashChartPalette?: string;
  dashCustomColors?: string[];
  dashChartSizes?: Record<string, { w?: number; h?: number }>;

  // Widgets
  widgetOrder?: string[];
  widgetVisibility?: Record<string, boolean>;

  // Sidebar
  sidebarOrder?: Record<string, string[]>;

  // Notifications
  notifPrefs?: NotifPrefs;
  /** ISO of the last day a tap-digest email was queued. Prevents duplicate digests. */
  lastTapDigestAt?: string;

  // Cookies
  cookiePrefs?: CookiePrefsBlob;

  // Security
  /** ISO timestamp of the last password change. Used for the 90-day rotation prompt. */
  passwordChangedAt?: string;
  /** ISO timestamp of when the user last dismissed the rotation prompt. 7-day snooze. */
  passwordRotationSnoozedAt?: string;
}

const LS_CACHE_KEY = "user_prefs_cache_v1";

function loadLocal(): PrefsBlob {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // First-run migration from legacy keys
  const legacy: PrefsBlob = {};
  try {
    const theme = localStorage.getItem("admin_theme");
    if (theme) legacy.theme = theme;
    const colorMode = localStorage.getItem("admin_color_mode");
    if (colorMode === "light" || colorMode === "dark" || colorMode === "system") legacy.colorMode = colorMode;
    const eng = localStorage.getItem("nfc_dash_engagement_order");
    if (eng) legacy.dashEngagementOrder = JSON.parse(eng);
    const tech = localStorage.getItem("nfc_dash_technical_order");
    if (tech) legacy.dashTechnicalOrder = JSON.parse(tech);
    const sec = localStorage.getItem("nfc_dash_security_order");
    if (sec) legacy.dashSecurityOrder = JSON.parse(sec);
    const vis = localStorage.getItem("nfc_dash_chart_visibility");
    if (vis) legacy.dashChartVisibility = JSON.parse(vis);
    const pal = localStorage.getItem("nfc_dash_chart_palette");
    if (pal) legacy.dashChartPalette = pal;
    const custom = localStorage.getItem("nfc_dash_custom_colors");
    if (custom) legacy.dashCustomColors = JSON.parse(custom);
    const sizes = localStorage.getItem("nfc_dash_chart_sizes");
    if (sizes) legacy.dashChartSizes = JSON.parse(sizes);
    const wOrder = localStorage.getItem("nfc_widget_order");
    if (wOrder) legacy.widgetOrder = JSON.parse(wOrder);
    const wVis = localStorage.getItem("nfc_widget_visibility");
    if (wVis) legacy.widgetVisibility = JSON.parse(wVis);
    const notif = localStorage.getItem("notification_prefs");
    if (notif) legacy.notifPrefs = JSON.parse(notif);
    const consent = localStorage.getItem("cookie-consent");
    if (consent) {
      const parsed = JSON.parse(consent);
      legacy.cookiePrefs = {
        essential: true,
        analytics: !!parsed.analytics,
        functional: !!parsed.functional,
        decided: true,
        decidedAt: new Date().toISOString(),
      };
    }
  } catch {}
  return legacy;
}

function saveLocal(p: PrefsBlob) {
  try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(p)); } catch {}
}

interface Ctx {
  prefs: PrefsBlob;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  /** Patch one or more pref keys. Saves immediately to local + debounced to cloud. */
  setPref: <K extends keyof PrefsBlob>(key: K, value: PrefsBlob[K]) => void;
  /** Patch many keys at once. */
  patchPrefs: (patch: Partial<PrefsBlob>) => void;
  /** Add a new in-app notification (also pushed to cloud). */
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

const PreferencesContext = createContext<Ctx>({
  prefs: {},
  notifications: [],
  unreadCount: 0,
  loading: true,
  setPref: () => {},
  patchPrefs: () => {},
  addNotification: () => {},
  markAllRead: () => {},
  clearNotifications: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<PrefsBlob>(() => loadLocal());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from cloud when user logs in
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      hydratedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("prefs, notifications")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[prefs] fetch failed", error.message);
        setLoading(false);
        return;
      }
      if (data) {
        const cloudPrefs = (data.prefs ?? {}) as unknown as PrefsBlob;
        const merged: PrefsBlob = { ...prefs, ...cloudPrefs };
        setPrefs(merged);
        saveLocal(merged);
        const cloudNotifs = (data.notifications ?? []) as unknown as AppNotification[];
        setNotifications(Array.isArray(cloudNotifs) ? cloudNotifs.slice(0, 50) : []);
      } else {
        // First time — push current local cache (legacy migration) up to cloud
        const local = loadLocal();
        await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, prefs: local as any, notifications: [] as any }, { onConflict: "user_id" });
      }
      hydratedRef.current = true;
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Realtime sync of preferences across tabs/devices for the same user
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user_prefs_${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_preferences",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const newRow = payload.new;
        if (!newRow) return;
        if (newRow.prefs) {
          setPrefs((prev) => {
            const merged = { ...prev, ...newRow.prefs };
            saveLocal(merged);
            return merged;
          });
        }
        if (newRow.notifications) {
          setNotifications(newRow.notifications);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const debouncedCloudSave = useCallback((next: PrefsBlob) => {
    if (!user || !hydratedRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, prefs: next as any }, { onConflict: "user_id" });
    }, 600);
  }, [user]);

  const setPref = useCallback(<K extends keyof PrefsBlob>(key: K, value: PrefsBlob[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveLocal(next);
      debouncedCloudSave(next);
      return next;
    });
  }, [debouncedCloudSave]);

  const patchPrefs = useCallback((patch: Partial<PrefsBlob>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      debouncedCloudSave(next);
      return next;
    });
  }, [debouncedCloudSave]);

  const persistNotifications = useCallback(async (next: AppNotification[]) => {
    if (!user) return;
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, notifications: next as any }, { onConflict: "user_id" });
  }, [user]);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    setNotifications((prev) => {
      const newNotif: AppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      const next = [newNotif, ...prev].slice(0, 50);
      persistNotifications(next);
      return next;
    });
  }, [persistNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistNotifications(next);
      return next;
    });
  }, [persistNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    persistNotifications([]);
  }, [persistNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PreferencesContext.Provider value={{ prefs, notifications, unreadCount, loading, setPref, patchPrefs, addNotification, markAllRead, clearNotifications }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
