import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences, type CookiePrefsBlob } from "@/contexts/PreferencesContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Compatibility shim — older code reads the legacy CookiePrefs shape.
 * We keep the same type alias so other files don't break.
 */
export type CookiePrefs = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  declined?: boolean;
};

export function getCookiePrefs(): CookiePrefs {
  // Reads from the unified prefs cache so the answer is consistent
  // wherever we're called (banner, settings, gating).
  try {
    const raw = localStorage.getItem("user_prefs_cache_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      const cp = parsed.cookiePrefs as CookiePrefsBlob | undefined;
      if (cp?.decided) {
        return {
          essential: true,
          analytics: !!cp.analytics,
          functional: !!cp.functional,
          declined: cp.analytics === false && cp.functional === false ? true : undefined,
        };
      }
    }
    // Legacy fallback
    const legacy = localStorage.getItem("cookie-consent");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      return { essential: true, analytics: !!parsed.analytics, functional: !!parsed.functional, declined: !!parsed.declined };
    }
  } catch {}
  return { essential: true, analytics: false, functional: false };
}

export function saveCookiePrefs(prefs: CookiePrefs) {
  // Legacy callers — write to the unified cache so reads stay consistent.
  try {
    const raw = localStorage.getItem("user_prefs_cache_v1");
    const blob = raw ? JSON.parse(raw) : {};
    blob.cookiePrefs = {
      essential: true,
      analytics: prefs.analytics,
      functional: prefs.functional,
      decided: true,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem("user_prefs_cache_v1", JSON.stringify(blob));
    // Keep legacy key for any third-party that still reads it.
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
  } catch {}
}

/** Helper for callers that want to gate functionality. */
export function isCookieAllowed(category: "analytics" | "functional"): boolean {
  const cp = getCookiePrefs();
  return !!cp[category];
}

export function CookieConsentBanner() {
  const { user, loading: authLoading } = useAuth();
  const { prefs, patchPrefs, loading: prefsLoading } = usePreferences();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, functional: false });

  // Public routes never see the banner
  const isPublicRoute =
    location.pathname.startsWith("/p/") ||
    location.pathname.startsWith("/u/") ||
    location.pathname === "/terms" ||
    location.pathname === "/privacy" ||
    location.pathname === "/page-builder";

  const cookiePrefs = prefs.cookiePrefs;

  useEffect(() => {
    if (authLoading || prefsLoading) return;
    if (!user || isPublicRoute) {
      setVisible(false);
      return;
    }
    if (!cookiePrefs?.decided) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [user, authLoading, prefsLoading, isPublicRoute, cookiePrefs?.decided]);

  const decide = (mode: "all" | "essential" | "custom" | "decline") => {
    const final: CookiePrefsBlob =
      mode === "all"      ? { essential: true, analytics: true,  functional: true,  decided: true, decidedAt: new Date().toISOString() } :
      mode === "decline"  ? { essential: true, analytics: false, functional: false, decided: true, decidedAt: new Date().toISOString() } :
      mode === "essential"? { essential: true, analytics: false, functional: false, decided: true, decidedAt: new Date().toISOString() } :
                            { essential: true, analytics: draft.analytics, functional: draft.functional, decided: true, decidedAt: new Date().toISOString() };

    patchPrefs({ cookiePrefs: final });
    // Also write legacy keys so third-party libs / older code agree
    saveCookiePrefs({ essential: true, analytics: final.analytics, functional: final.functional, declined: !final.analytics && !final.functional });
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg"
        >
          <div className="rounded-xl border border-border bg-card/95 backdrop-blur-lg p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Cookie & Data Privacy Preferences</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    In compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, we use cookies to operate the Service and improve your experience. You may choose which cookies to accept.{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1.5 italic">
                    Your choice is saved to your account and follows you across browsers.
                  </p>
                </div>

                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expanded ? "Hide details" : "Customize cookies"}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      <CookieRow label="Essential" desc="Authentication & security (required)" checked disabled />
                      <CookieRow
                        label="Analytics"
                        desc="Usage patterns & tap counts"
                        checked={draft.analytics}
                        onCheckedChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
                      />
                      <CookieRow
                        label="Functional"
                        desc="Theme, layout & notification preferences"
                        checked={draft.functional}
                        onCheckedChange={(v) => setDraft((d) => ({ ...d, functional: v }))}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={() => decide("all")} className="text-xs">Accept All</Button>
                  {expanded ? (
                    <Button size="sm" variant="outline" onClick={() => decide("custom")} className="text-xs">Save Preferences</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => decide("essential")} className="text-xs">Essential Only</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => decide("decline")} className="text-xs text-muted-foreground">Decline All</Button>
                </div>
              </div>
              <button onClick={() => decide("essential")} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CookieRow({ label, desc, checked, disabled, onCheckedChange }: {
  label: string; desc: string; checked: boolean; disabled?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className={disabled ? "opacity-60" : ""} />
    </div>
  );
}

interface CookieGateProps { category: "analytics" | "functional"; children: ReactNode; fallback?: ReactNode; }
export function CookieGate({ category, children, fallback = null }: CookieGateProps) {
  const allowed = isCookieAllowed(category);
  return <>{allowed ? children : fallback}</>;
}
