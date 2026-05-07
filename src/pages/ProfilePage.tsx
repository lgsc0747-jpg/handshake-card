import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Camera, Mail, Link2, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    display_name: "",
    username: "",
    email_public: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name, username, email_public")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url);
          setProfile({
            display_name: data.display_name ?? "",
            username: data.username ?? "",
            email_public: data.email_public ?? user.email ?? "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Account updated" });
    setSaving(false);
  };

  const update = (f: string, v: string) => setProfile((p) => ({ ...p, [f]: v }));

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <p className="text-eyebrow text-muted-foreground">Account</p>
          <h1 className="text-display font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account-level details. Public design and content live in your <a href="/personas" className="text-accent underline">personas</a>.
          </p>
        </div>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-sm">Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="w-16 h-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                  <AvatarFallback className="text-xl">{(profile.display_name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
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
                {profile.username && <p className="text-xs text-accent">/p/{profile.username}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-eyebrow text-muted-foreground">Display name</label>
                <Input value={profile.display_name} onChange={(e) => update("display_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-eyebrow text-muted-foreground">Username</label>
                <Input value={profile.username} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-eyebrow text-muted-foreground">Public email (account fallback)</label>
                <Input type="email" value={profile.email_public} onChange={(e) => update("email_public", e.target.value)} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="rounded-sm">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
