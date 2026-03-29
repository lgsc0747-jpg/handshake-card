import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingCard3D } from "@/components/FloatingCard3D";
import { downloadVCard } from "@/lib/vcard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Mail, Phone, Globe, Linkedin, Github,
  Download, UserPlus, FileText, Loader2, Wifi,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
        // Log via edge function (works for anonymous visitors)
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_user_id: data.user_id,
            interaction_type: "profile_view",
            metadata: { source: "public_landing", ua: navigator.userAgent },
          }),
        }).catch(() => {});
      }
      setLoading(false);
    };

    load();
  }, [username]);

  const handleDownloadVCard = () => {
    if (!profile) return;
    downloadVCard({
      displayName: profile.display_name ?? undefined,
      email: profile.email_public ?? undefined,
      phone: profile.phone ?? undefined,
      website: profile.website ?? undefined,
      linkedin: profile.linkedin_url ?? undefined,
      github: profile.github_url ?? undefined,
      headline: profile.headline ?? undefined,
      location: profile.location ?? undefined,
    });
  };

  const handleDownloadCV = async () => {
    if (!profile?.cv_url) return;

    // Log via edge function
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: profile.user_id,
        interaction_type: "cv_download",
        metadata: { source: "public_landing", ua: navigator.userAgent },
      }),
    }).catch(() => {});

    window.open(profile.cv_url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Wifi className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold">Profile Not Found</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          The user <span className="font-mono text-foreground">@{username}</span> doesn't exist or hasn't set up their profile yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero with 3D card */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto pt-8 px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
              <Wifi className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-display font-semibold tracking-widest uppercase text-muted-foreground">
              NFC Hub
            </span>
          </div>
          <FloatingCard3D
            name={profile.display_name ?? username ?? ""}
            status={profile.availability_status ?? "Available"}
          />
        </div>
      </div>

      {/* Profile info */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">
        {/* Identity */}
        <div className="text-center space-y-2">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? "Avatar"}
              className="w-20 h-20 rounded-full mx-auto border-2 border-border object-cover"
            />
          )}
          <h1 className="text-2xl font-display font-bold">{profile.display_name}</h1>
          {profile.headline && (
            <p className="text-muted-foreground">{profile.headline}</p>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {profile.show_availability && (
              <Badge variant="default" className="gradient-primary text-primary-foreground border-0">
                {profile.availability_status ?? "Available"}
              </Badge>
            )}
            {profile.work_mode && (
              <Badge variant="secondary">{profile.work_mode}</Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="glass-card rounded-lg p-4">
            <p className="text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
          </div>
        )}

        {/* Contact details */}
        <div className="glass-card rounded-lg divide-y divide-border/60">
          {profile.show_location && profile.location && (
            <div className="flex items-center gap-3 p-3.5">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{profile.location}</span>
            </div>
          )}
          {profile.email_public && (
            <a href={`mailto:${profile.email_public}`} className="flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{profile.email_public}</span>
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{profile.phone}</span>
            </a>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{profile.website}</span>
            </a>
          )}
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors">
              <Linkedin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">LinkedIn</span>
            </a>
          )}
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors">
              <Github className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">GitHub</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button onClick={handleDownloadVCard} className="w-full gradient-primary text-primary-foreground h-12">
            <UserPlus className="w-4 h-4 mr-2" /> Save Contact
          </Button>
          {profile.cv_url && (
            <Button onClick={handleDownloadCV} variant="outline" className="w-full h-12">
              <FileText className="w-4 h-4 mr-2" /> Download CV / Resume
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by <span className="font-display font-semibold">NFC Hub</span>
        </p>
      </div>
    </div>
  );
};

export default PublicProfilePage;
