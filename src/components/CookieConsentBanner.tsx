import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_KEY = "cookie-consent";

export type CookiePrefs = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  declined?: boolean; // true when user chose "Decline All"
};

export function getCookiePrefs(): CookiePrefs {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { essential: true, analytics: false, functional: false };
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "essential" in parsed) {
      return { essential: true, analytics: !!parsed.analytics, functional: !!parsed.functional, declined: !!parsed.declined };
    }
    if (raw === "all") return { essential: true, analytics: true, functional: true };
    return { essential: true, analytics: false, functional: false };
  } catch {
    return { essential: true, analytics: false, functional: false };
  }
}

export function saveCookiePrefs(prefs: CookiePrefs) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

export function CookieConsentBanner() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({ essential: true, analytics: false, functional: false });

  useEffect(() => {
    // Only show after auth is resolved and user is logged in
    if (loading || !user) return;
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const accept = (mode: "all" | "essential" | "custom" | "decline") => {
    const final: CookiePrefs =
      mode === "all"
        ? { essential: true, analytics: true, functional: true }
        : mode === "decline"
        ? { essential: true, analytics: false, functional: false, declined: true }
        : mode === "essential"
        ? { essential: true, analytics: false, functional: false }
        : prefs;
    saveCookiePrefs(final);
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
                      <div className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-xs font-medium text-foreground">Essential</p>
                          <p className="text-[10px] text-muted-foreground">Authentication & security (required)</p>
                        </div>
                        <Switch checked disabled className="opacity-60" />
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-xs font-medium text-foreground">Analytics</p>
                          <p className="text-[10px] text-muted-foreground">Usage patterns & tap counts</p>
                        </div>
                        <Switch
                          checked={prefs.analytics}
                          onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-xs font-medium text-foreground">Functional</p>
                          <p className="text-[10px] text-muted-foreground">Theme, layout & notification preferences</p>
                        </div>
                        <Switch
                          checked={prefs.functional}
                          onCheckedChange={(v) => setPrefs((p) => ({ ...p, functional: v }))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => accept("all")} className="text-xs">
                    Accept All
                  </Button>
                  {expanded ? (
                    <Button size="sm" variant="outline" onClick={() => accept("custom")} className="text-xs">
                      Save Preferences
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => accept("essential")} className="text-xs">
                      Essential Only
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => accept("decline")} className="text-xs text-muted-foreground">
                    Decline All
                  </Button>
                </div>
              </div>
              <button onClick={() => accept("decline")} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
