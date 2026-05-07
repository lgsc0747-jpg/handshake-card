import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Paintbrush, Cookie, FileText, Shield, Check, LogOut, Trash2,
  KeyRound, Bell, UserX, User, Palette,
} from "lucide-react";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardTheme } from "@/contexts/DashboardThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCookiePrefs, saveCookiePrefs, type CookiePrefs } from "@/components/CookieConsentBanner";

const NOTIF_KEY = "notification_prefs";

const SettingsPage = () => {
  const { theme, setTheme } = useDashboardTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Cookie prefs
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>(getCookiePrefs);
  const updateCookiePref = (key: keyof Omit<CookiePrefs, "essential">, value: boolean) => {
    const updated = { ...cookiePrefs, [key]: value };
    setCookiePrefs(updated);
    saveCookiePrefs(updated);
    toast({ title: "Cookie preferences updated" });
  };

  // Password
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

  const handleClearData = () => {
    localStorage.removeItem("nfc_widget_order");
    localStorage.removeItem("nfc_widget_visibility");
    localStorage.removeItem("cookie-consent");
    toast({ title: "Local data cleared" });
    setCookiePrefs({ essential: true, analytics: false, functional: false });
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
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const Section = ({ title, description, children, icon }: {
    title: string; description?: string; children: React.ReactNode; icon: React.ReactNode;
  }) => (
    <Card className="rounded-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-sm border border-border flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="pl-11 space-y-4">{children}</div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <p className="text-eyebrow text-muted-foreground">Workspace</p>
          <h1 className="text-display font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account, security, notifications, and platform preferences.
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full sm:w-auto rounded-sm bg-muted/40 p-1 h-auto">
            <TabsTrigger value="account" className="rounded-sm text-xs py-1.5">Account</TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-sm text-xs py-1.5">Appearance</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-sm text-xs py-1.5">Notify</TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-sm text-xs py-1.5">Privacy</TabsTrigger>
            <TabsTrigger value="danger" className="rounded-sm text-xs py-1.5">Danger</TabsTrigger>
          </TabsList>

          {/* ─── Account ─── */}
          <TabsContent value="account" className="space-y-4">
            <Section
              title="Profile"
              description="Update your display name, username, and avatar."
              icon={<User className="w-4 h-4" />}
            >
              <p className="text-sm text-muted-foreground">
                Account details are managed on the{" "}
                <Link to="/profile" className="text-accent underline">Profile</Link> page.
              </p>
            </Section>

            <Section
              title="Change password"
              description="Use a strong, unique password for your account."
              icon={<KeyRound className="w-4 h-4" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-eyebrow text-muted-foreground">New password</Label>
                  <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-eyebrow text-muted-foreground">Confirm password</Label>
                  <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <Button size="sm" className="rounded-sm" onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
                {changingPassword ? "Updating…" : "Update password"}
              </Button>
            </Section>
          </TabsContent>

          {/* ─── Appearance ─── */}
          <TabsContent value="appearance" className="space-y-4">
            <Section
              title="Dashboard theme"
              description="Pick a color theme for the admin workspace. Public personas have their own theme settings."
              icon={<Palette className="w-4 h-4" />}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(DASHBOARD_THEMES) as [DashboardTheme, typeof DASHBOARD_THEMES[DashboardTheme]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-sm border transition-all text-left ${
                      theme === key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      <span className="w-3 h-3 rounded-sm border border-border" style={{ background: cfg.preview }} />
                      <span className="w-3 h-3 rounded-sm border border-border" style={{ background: cfg.secondary }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
                    </div>
                    {theme === key && <Check className="w-3 h-3 text-accent shrink-0" />}
                  </button>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* ─── Notifications ─── */}
          <TabsContent value="notifications" className="space-y-4">
            <Section
              title="Notification preferences"
              description="Choose how you'd like to be notified."
              icon={<Bell className="w-4 h-4" />}
            >
              <div className="space-y-3">
                {[
                  { k: "emailLeads", l: "Email — new leads", d: "When someone submits a contact form" },
                  { k: "emailTaps", l: "Email — card taps", d: "Each time your card is tapped" },
                  { k: "inAppLeads", l: "In-app — new leads", d: "Toast when a lead arrives" },
                  { k: "inAppTaps", l: "In-app — card taps", d: "Toast on each card tap" },
                ].map((n) => (
                  <div key={n.k} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{n.l}</p>
                      <p className="text-xs text-muted-foreground">{n.d}</p>
                    </div>
                    <Switch checked={notifPrefs[n.k]} onCheckedChange={(v) => updateNotifPref(n.k, v)} />
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* ─── Privacy ─── */}
          <TabsContent value="privacy" className="space-y-4">
            <Section
              title="Cookies"
              description="In compliance with the Data Privacy Act (RA 10173)."
              icon={<Cookie className="w-4 h-4" />}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Essential</p>
                    <p className="text-xs text-muted-foreground">Auth, sessions & security (required)</p>
                  </div>
                  <Switch checked disabled className="opacity-60" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Analytics</p>
                    <p className="text-xs text-muted-foreground">Anonymized usage patterns</p>
                  </div>
                  <Switch checked={cookiePrefs.analytics} onCheckedChange={(v) => updateCookiePref("analytics", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Functional</p>
                    <p className="text-xs text-muted-foreground">Theme, layout & notification settings</p>
                  </div>
                  <Switch checked={cookiePrefs.functional} onCheckedChange={(v) => updateCookiePref("functional", v)} />
                </div>
              </div>
              <Separator />
              <Button variant="outline" size="sm" className="rounded-sm" onClick={handleClearData}>
                <Trash2 className="w-3 h-3 mr-1.5" /> Clear local cookie data
              </Button>
            </Section>

            <Section
              title="Legal"
              description="Read our terms and how we handle your data."
              icon={<FileText className="w-4 h-4" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Link to="/terms" className="flex items-center justify-between p-3 rounded-sm border border-border hover:border-accent/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">Terms of Service</span>
                  </div>
                  <span className="text-eyebrow text-muted-foreground">→</span>
                </Link>
                <Link to="/privacy" className="flex items-center justify-between p-3 rounded-sm border border-border hover:border-accent/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">Privacy Policy</span>
                  </div>
                  <span className="text-eyebrow text-muted-foreground">→</span>
                </Link>
              </div>
            </Section>
          </TabsContent>

          {/* ─── Danger ─── */}
          <TabsContent value="danger" className="space-y-4">
            <Section
              title="Sign out"
              description="End your session on this device."
              icon={<LogOut className="w-4 h-4" />}
            >
              <Button variant="outline" className="rounded-sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-1.5" /> Sign out
              </Button>
            </Section>

            <Section
              title="Delete account"
              description="Permanently delete your account and all associated data. Irreversible."
              icon={<UserX className="w-4 h-4 text-destructive" />}
            >
              <Button variant="destructive" size="sm" className="rounded-sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-3 h-3 mr-1.5" /> Delete my account
              </Button>
            </Section>
          </TabsContent>
        </Tabs>

        <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
