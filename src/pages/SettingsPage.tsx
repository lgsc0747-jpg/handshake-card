import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Paintbrush, Cookie, FileText, Shield, Check, LogOut, Trash2,
} from "lucide-react";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardTheme } from "@/contexts/DashboardThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CONSENT_KEY = "cookie-consent";

const SettingsPage = () => {
  const { theme, setTheme } = useDashboardTheme();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [cookieConsent, setCookieConsent] = useState(() => localStorage.getItem(CONSENT_KEY) ?? "none");

  const handleCookieChange = (value: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, value);
    setCookieConsent(value);
    toast({ title: "Cookie preferences saved" });
  };

  const handleClearData = () => {
    localStorage.removeItem("nfc_widget_order");
    localStorage.removeItem("nfc_widget_visibility");
    localStorage.removeItem(CONSENT_KEY);
    toast({ title: "Local data cleared", description: "Widget layout and cookie preferences have been reset." });
    setCookieConsent("none");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences, privacy, and appearance</p>
        </div>

        {/* Appearance */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Paintbrush className="w-4 h-4" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Dashboard Theme</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(DASHBOARD_THEMES) as [DashboardTheme, typeof DASHBOARD_THEMES[DashboardTheme]][]).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        theme === key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-border"
                        style={{ background: cfg.preview }}
                      />
                      <div className="text-left">
                        <span className="text-sm font-medium">{cfg.label}</span>
                        <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                      </div>
                      {theme === key && <Check className="w-3.5 h-3.5 text-primary absolute top-2 right-2" />}
                    </button>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Cookies */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Cookie className="w-4 h-4" /> Privacy & Cookies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analytics Cookies</p>
                <p className="text-xs text-muted-foreground">Help us understand how you use the app</p>
              </div>
              <Switch
                checked={cookieConsent === "all"}
                onCheckedChange={(checked) => handleCookieChange(checked ? "all" : "essential")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Essential Cookies</p>
                <p className="text-xs text-muted-foreground">Required for authentication and basic functionality</p>
              </div>
              <Switch checked disabled />
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleClearData}>
                <Trash2 className="w-3 h-3 mr-1.5" />
                Clear Local Data
              </Button>
              <p className="text-[10px] text-muted-foreground">Resets widget layout and cookie preferences</p>
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/terms"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-medium">Terms of Service</p>
                  <p className="text-[10px] text-muted-foreground">Read our terms and conditions</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">→</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-medium">Privacy Policy</p>
                  <p className="text-[10px] text-muted-foreground">How we handle your data</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">→</span>
            </Link>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
