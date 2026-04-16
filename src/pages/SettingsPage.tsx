import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Paintbrush, Cookie, FileText, Shield, Check, LogOut, Trash2,
  KeyRound, Bell, UserX, User, Camera, Loader2, Save, Crop,
} from "lucide-react";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { useDashboardTheme, DASHBOARD_THEMES, type DashboardTheme } from "@/contexts/DashboardThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCookiePrefs, saveCookiePrefs, type CookiePrefs } from "@/components/CookieConsentBanner";
import { ImageCropperModal } from "@/components/DesignStudio/ImageCropperModal";

const NOTIF_KEY = "notification_prefs";

const SettingsPage = () => {
  const { theme, setTheme, colorMode, setColorMode, resolvedColorMode } = useDashboardTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    display_name: "",
    username: "",
    email_public: "",
    headline: "",
    bio: "",
    phone: "",
    location: "",
    website: "",
    linkedin_url: "",
    github_url: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url);
          setProfile({
            display_name: data.display_name ?? "",
            username: data.username ?? "",
            email_public: data.email_public ?? user.email ?? "",
            headline: data.headline ?? "",
            bio: data.bio ?? "",
            phone: data.phone ?? "",
            location: data.location ?? "",
            website: data.website ?? "",
            linkedin_url: data.linkedin_url ?? "",
            github_url: data.github_url ?? "",
          });
        }
        setProfileLoading(false);
      });
  }, [user]);

  const updateField = (field: string, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);
    setProfileSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, preferences, privacy, and appearance</p>
        </div>

        {/* Profile */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <User className="w-4 h-4" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-16 h-16">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                      <AvatarFallback className="bg-accent text-accent-foreground text-xl font-display">
                        {(profile.display_name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <p className="font-medium">{profile.display_name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {profile.username && <p className="text-xs text-primary">/p/{profile.username}</p>}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setShowAvatarCropper(true)}
                        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 transition-colors"
                      >
                        <Crop className="w-3 h-3" /> Adjust position
                      </button>
                    )}
                  </div>
                </div>

                {showAvatarCropper && avatarUrl && (
                  <ImageCropperModal
                    src={avatarUrl}
                    cropAspectRatio={1}
                    cropLabel="Profile Picture (circle crop)"
                    initialPosition={{ x: 50, y: 50, scale: 100 }}
                    onConfirm={async (position) => {
                      setShowAvatarCropper(false);
                      if (!user) return;
                      // Save the cropped avatar_url with position params appended
                      const baseUrl = avatarUrl.split("?")[0];
                      const newUrl = `${baseUrl}?t=${Date.now()}&cx=${position.x}&cy=${position.y}&cs=${position.scale}`;
                      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
                      setAvatarUrl(newUrl);
                      toast({ title: "Avatar position saved" });
                    }}
                    onCancel={() => setShowAvatarCropper(false)}
                  />
                )}

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name</Label>
                    <Input value={profile.display_name} onChange={(e) => updateField("display_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Username</Label>
                    <Input value={profile.username} onChange={(e) => updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Headline</Label>
                    <Input value={profile.headline} onChange={(e) => updateField("headline", e.target.value)} placeholder="Full-Stack Developer" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Public Email</Label>
                    <Input type="email" value={profile.email_public} onChange={(e) => updateField("email_public", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location</Label>
                    <Input value={profile.location} onChange={(e) => updateField("location", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input value={profile.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">LinkedIn</Label>
                    <Input value={profile.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GitHub</Label>
                    <Input value={profile.github_url} onChange={(e) => updateField("github_url", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Bio</Label>
                  <Textarea value={profile.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="Tell the world about yourself…" rows={3} />
                </div>

                <Button size="sm" onClick={handleProfileSave} disabled={profileSaving}>
                  {profileSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Paintbrush className="w-4 h-4" /> Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Choose a color theme for the dashboard</p>
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
                      <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: cfg.preview }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: cfg.secondary }} />
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
              <Input id="new-pw" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="text-xs">Confirm New Password</Label>
              <Input id="confirm-pw" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
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
            <p className="text-xs text-muted-foreground">
              In compliance with the <strong>Data Privacy Act (RA 10173)</strong>, you can manage which cookies are active.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Essential Cookies</p>
                  <p className="text-[10px] text-muted-foreground">Authentication, session management & security (required)</p>
                </div>
                <Switch checked disabled className="opacity-60" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Analytics Cookies</p>
                  <p className="text-[10px] text-muted-foreground">Anonymized usage patterns, page views & tap analytics</p>
                </div>
                <Switch checked={cookiePrefs.analytics} onCheckedChange={(v) => updateCookiePref("analytics", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Functional Cookies</p>
                  <p className="text-[10px] text-muted-foreground">Theme preferences, widget layout & notification settings</p>
                </div>
                <Switch checked={cookiePrefs.functional} onCheckedChange={(v) => updateCookiePref("functional", v)} />
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleClearData}>
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete All Cookie Data
              </Button>
              <p className="text-[10px] text-muted-foreground">Resets all preferences and clears stored cookie data</p>
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Legal & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">
              Our platform operates in compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
            </p>
            <Link to="/terms" className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-colors group">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-medium">Terms of Service</p>
                  <p className="text-[10px] text-muted-foreground">Read our terms, data rights & RA 10173 compliance</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">→</span>
            </Link>
            <Link to="/privacy" className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 transition-colors group">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-medium">Privacy Policy</p>
                  <p className="text-[10px] text-muted-foreground">How we collect, process & protect your data under RA 10173</p>
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
          <CardContent className="space-y-4">
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-4 h-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">Delete Account</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account and all associated data. This action is irreversible and complies with the right to erasure under <strong>RA 10173</strong>.
              </p>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
