import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Cookie, FileText, Shield, Check, LogOut, Trash2,
  KeyRound, Bell, UserX, User, Palette, Camera, Loader2, Mail, Link2, Unlink, Save,
} from "lucide-react";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { useDashboardTheme, type ColorMode } from "@/contexts/DashboardThemeContext";
import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCookiePrefs, saveCookiePrefs, type CookiePrefs } from "@/components/CookieConsentBanner";

const NOTIF_KEY = "notification_prefs";

const SettingsPage = () => {
  const { colorMode, setColorMode } = useDashboardTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "account";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ─── Profile (merged from ProfilePage) ───
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({ display_name: "", username: "", email_public: "" });

  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const [identities, setIdentities] = useState<Array<{ id: string; provider: string }>>([]);
  const [identityBusy, setIdentityBusy] = useState<string | null>(null);

  const refreshIdentities = async () => {
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(((data?.identities ?? []) as any[]).map((i) => ({ id: i.identity_id, provider: i.provider })));
  };

  useEffect(() => { refreshIdentities(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("avatar_url, display_name, username, email_public")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setAvatarUrl(data.avatar_url);
          setProfile({
            display_name: data.display_name ?? "",
            username: data.username ?? "",
            email_public: data.email_public ?? user.email ?? "",
          });
        }
        setProfileLoading(false);
      });
    return () => { cancelled = true; };
    // Intentionally only depend on user.id so token refreshes don't clobber unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateProfile = (f: string, v: string) => setProfile((p) => ({ ...p, [f]: v }));

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Account updated" });
    setSavingProfile(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
    setAvatarUrl(newUrl);
    toast({ title: "Avatar updated" });
    setUploading(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin + "/settings?tab=account" },
    );
    setChangingEmail(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Confirmation sent", description: "Check both your old and new inbox to confirm." });
    setNewEmail("");
  };

  const linkProvider = async (provider: "google" | "apple") => {
    setIdentityBusy(provider);
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: window.location.origin + "/settings?tab=account" },
    } as any);
    setIdentityBusy(null);
    if (error) toast({ title: "Could not start linking", description: error.message, variant: "destructive" });
  };

  const unlinkProvider = async (provider: string) => {
    const target = (await supabase.auth.getUserIdentities()).data?.identities?.find((i: any) => i.provider === provider);
    if (!target) return;
    setIdentityBusy(provider);
    const { error } = await supabase.auth.unlinkIdentity(target as any);
    setIdentityBusy(null);
    if (error) return toast({ title: "Unlink failed", description: error.message, variant: "destructive" });
    toast({ title: `Disconnected ${provider}` });
    refreshIdentities();
  };

  // ─── Cookies / Notifications / Password ───
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>(getCookiePrefs);
  const updateCookiePref = (key: keyof Omit<CookiePrefs, "essential">, value: boolean) => {
    const updated = { ...cookiePrefs, [key]: value };
    setCookiePrefs(updated);
    saveCookiePrefs(updated);
    toast({ title: "Cookie preferences updated" });
  };

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="sm:pl-12 space-y-4">{children}</div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-7 max-w-4xl">
        <div>
          <p className="text-eyebrow text-muted-foreground">Workspace</p>
          <h1 className="text-display tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Account, security, notifications, and platform preferences.
          </p>
        </div>

        <Tabs
          value={initialTab}
          onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
          className="space-y-5"
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full sm:w-auto rounded-xl bg-muted/50 p-1 h-auto">
            <TabsTrigger value="account" className="rounded-lg text-xs py-1.5">Account</TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg text-xs py-1.5">Appearance</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg text-xs py-1.5">Notify</TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-lg text-xs py-1.5">Privacy</TabsTrigger>
            <TabsTrigger value="danger" className="rounded-lg text-xs py-1.5">Danger</TabsTrigger>
          </TabsList>

          {/* ─── Account ─── */}
          <TabsContent value="account" className="space-y-4">
            <Section
              title="Profile"
              description="Your display name, username, and avatar."
              icon={<User className="w-4 h-4" />}
            >
              {profileLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="w-16 h-16 rounded-xl">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" className="rounded-xl" />}
                        <AvatarFallback className="rounded-xl text-lg">
                          {(profile.display_name || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {uploading
                          ? <Loader2 className="w-5 h-5 text-background animate-spin" />
                          : <Camera className="w-5 h-5 text-background" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{profile.display_name || "Unnamed"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      {profile.username && <p className="text-xs text-accent truncate">/p/{profile.username}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-eyebrow text-muted-foreground">Display name</Label>
                      <Input value={profile.display_name} onChange={(e) => updateProfile("display_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-eyebrow text-muted-foreground">Username</Label>
                      <Input
                        value={profile.username}
                        onChange={(e) => updateProfile("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-eyebrow text-muted-foreground">Public email (account fallback)</Label>
                      <Input type="email" value={profile.email_public} onChange={(e) => updateProfile("email_public", e.target.value)} />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
                    {savingProfile ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Save profile
                  </Button>
                </>
              )}
            </Section>

            <Section
              title="Sign-in email"
              description="Changing your email requires confirming from both inboxes."
              icon={<Mail className="w-4 h-4" />}
            >
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-mono">{user?.email}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail} size="sm">
                  {changingEmail ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
                  Update email
                </Button>
              </div>
            </Section>

            <Section
              title="Linked accounts"
              description="Sign in faster with Google or Apple. You can keep your password too."
              icon={<Link2 className="w-4 h-4" />}
            >
              <div className="space-y-2">
                {(["google", "apple"] as const).map((p) => {
                  const linked = identities.some((i) => i.provider === p);
                  return (
                    <div key={p} className="flex items-center justify-between p-3 border border-border/60 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <span className="capitalize text-sm font-medium">{p}</span>
                        {linked && <Badge variant="secondary" className="text-[10px]">Linked</Badge>}
                      </div>
                      {linked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={identityBusy === p || identities.length <= 1}
                          onClick={() => unlinkProvider(p)}
                        >
                          <Unlink className="w-3.5 h-3.5 mr-1.5" />Unlink
                        </Button>
                      ) : (
                        <Button size="sm" disabled={identityBusy === p} onClick={() => linkProvider(p)}>
                          {identityBusy === p
                            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                          Link {p}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">GitHub and other providers aren't supported yet.</p>
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
              <Button size="sm" onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
                {changingPassword ? "Updating…" : "Update password"}
              </Button>
            </Section>
          </TabsContent>

          {/* ─── Appearance ─── */}
          <TabsContent value="appearance" className="space-y-4">
            <Section
              title="Appearance"
              description="Choose light, dark, or follow your system. The same palette is used across login, dashboard, and the page builder."
              icon={<Palette className="w-4 h-4" />}
            >
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {([
                  { value: "light",  label: "Light",  Icon: Sun },
                  { value: "dark",   label: "Dark",   Icon: Moon },
                  { value: "system", label: "System", Icon: MonitorSmartphone },
                ] as { value: ColorMode; label: string; Icon: any }[]).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setColorMode(value)}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                      colorMode === value ? "border-accent bg-accent/5" : "border-border/60 hover:border-accent/40"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                    {colorMode === value && (
                      <Check className="w-3.5 h-3.5 text-accent absolute top-2 right-2" />
                    )}
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
              <Button variant="outline" size="sm" onClick={handleClearData}>
                <Trash2 className="w-3 h-3 mr-1.5" /> Clear local cookie data
              </Button>
            </Section>

            <Section
              title="Legal"
              description="Read our terms and how we handle your data."
              icon={<FileText className="w-4 h-4" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Link to="/terms" className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:border-accent/40 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">Terms of Service</span>
                  </div>
                  <span className="text-eyebrow text-muted-foreground">→</span>
                </Link>
                <Link to="/privacy" className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:border-accent/40 hover:bg-muted/40 transition-colors">
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
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-1.5" /> Sign out
              </Button>
            </Section>

            <Section
              title="Delete account"
              description="Permanently delete your account and all associated data. Irreversible."
              icon={<UserX className="w-4 h-4 text-destructive" />}
            >
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
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
