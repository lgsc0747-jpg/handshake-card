import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paintbrush, Cookie, FileText, Shield, Check, LogOut, Trash2,
  KeyRound, Bell, Sun, Moon,
} from "lucide-react";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardTheme } from "@/contexts/DashboardThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "cookie-consent";
const NOTIF_KEY = "notification_prefs";

const SettingsPage = () => {
  const { theme, setTheme, colorMode, setColorMode } = useDashboardTheme();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [cookieConsent, setCookieConsent] = useState(() => localStorage.getItem(CONSENT_KEY) ?? "none");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY);
      return stored ? JSON.parse(stored) : { emailLeads: true, emailTaps: false, inAppLeads: true, inAppTaps: true };
    } catch {
      return { emailLeads: true, emailTaps: false, inAppLeads: true, inAppTaps: true };
    }
  });

  const updateNotifPref = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    toast({ title: "Notification preferences saved" });
  };

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

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
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
          <CardContent className="space-y-5">
            {/* Light / Dark Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {colorMode === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <div>
                  <p className="text-sm font-medium">Color Mode</p>
                  <p className="text-[10px] text-muted-foreground">
                    {colorMode === "dark" ? "Dark mode active" : "Light mode active"}
                  </p>
                </div>
              </div>
              <Switch
                checked={colorMode === "dark"}
                onCheckedChange={(checked) => setColorMode(checked ? "dark" : "light")}
              />
            </div>

            <Separator />

            {/* Theme Grid */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Dashboard Theme</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                      <div className="flex gap-1 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ background: cfg.preview }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ background: cfg.secondary }}
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="text-sm font-medium block truncate">{cfg.label}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
                      </div>
                      {theme === key && <Check className="w-3.5 h-3.5 text-primary absolute top-2 right-2" />}
                    </button>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="text-xs">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="text-xs">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Choose which notifications you'd like to receive.</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email — New Leads</p>
                  <p className="text-[10px] text-muted-foreground">Get notified when someone submits a contact form</p>
                </div>
                <Switch checked={notifPrefs.emailLeads} onCheckedChange={(v) => updateNotifPref("emailLeads", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email — Card Taps</p>
                  <p className="text-[10px] text-muted-foreground">Receive an email when your card is tapped</p>
                </div>
                <Switch checked={notifPrefs.emailTaps} onCheckedChange={(v) => updateNotifPref("emailTaps", v)} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">In-App — New Leads</p>
                  <p className="text-[10px] text-muted-foreground">Show a toast when a new lead arrives</p>
                </div>
                <Switch checked={notifPrefs.inAppLeads} onCheckedChange={(v) => updateNotifPref("inAppLeads", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">In-App — Card Taps</p>
                  <p className="text-[10px] text-muted-foreground">Show a toast on each card tap</p>
                </div>
                <Switch checked={notifPrefs.inAppTaps} onCheckedChange={(v) => updateNotifPref("inAppTaps", v)} />
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
