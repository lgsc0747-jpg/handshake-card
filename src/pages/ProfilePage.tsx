import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Loader2, Camera } from "lucide-react";
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
    headline: "",
    bio: "",
    phone: "",
    location: "",
    website: "",
    linkedin_url: "",
    github_url: "",
    availability_status: "Available",
    work_mode: "On-site",
    show_availability: true,
    show_location: true,
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
            availability_status: data.availability_status ?? "Available",
            work_mode: data.work_mode ?? "On-site",
            show_availability: data.show_availability ?? true,
            show_location: data.show_location ?? true,
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
      .update({
        display_name: profile.display_name,
        username: profile.username,
        email_public: profile.email_public,
        headline: profile.headline,
        bio: profile.bio,
        phone: profile.phone,
        location: profile.location,
        website: profile.website,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        availability_status: profile.availability_status,
        work_mode: profile.work_mode,
        show_availability: profile.show_availability,
        show_location: profile.show_location,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  const update = (field: string, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

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
          <h1 className="text-2xl font-display font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your digital identity and public landing page</p>
        </div>

        <Card className="glass-card animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-accent text-accent-foreground text-xl font-display">
                  {(profile.display_name || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile.display_name || "Unnamed"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {profile.username && (
                  <p className="text-xs text-primary">/p/{profile.username}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Display Name</label>
                <Input value={profile.display_name} onChange={(e) => update("display_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Username</label>
                <Input value={profile.username} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Headline</label>
                <Input value={profile.headline} onChange={(e) => update("headline", e.target.value)} placeholder="Full-Stack Developer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Public Email</label>
                <Input type="email" value={profile.email_public} onChange={(e) => update("email_public", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input value={profile.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Location</label>
                <Input value={profile.location} onChange={(e) => update("location", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Website</label>
                <Input value={profile.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">LinkedIn</label>
                <Input value={profile.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">GitHub</label>
                <Input value={profile.github_url} onChange={(e) => update("github_url", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Availability</label>
                <Input value={profile.availability_status} onChange={(e) => update("availability_status", e.target.value)} placeholder="Available for Hire" />
              </div>
            </div>

            <Button onClick={handleSave} className="gradient-primary text-primary-foreground" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
