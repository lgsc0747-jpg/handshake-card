import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { SecurityGate } from "@/components/SecurityGate";
import { CardDisabledPage } from "@/components/CardDisabledPage";
import { downloadVCard } from "@/lib/vcard";
import { getPresetCss } from "@/components/DesignStudio/BackgroundPresets";
import { getFontStack, getGoogleFontUrl } from "@/components/DesignStudio/FontPresets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Mail, Phone, Globe, Linkedin, Github,
  UserPlus, FileText, Loader2, Wifi, ChevronDown,
} from "lucide-react";

interface PersonaData {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  is_private: boolean;
  pin_code: string | null;
  require_contact_exchange: boolean;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  email_public: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  cv_url: string | null;
  accent_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  text_color: string | null;
  landing_bg_color: string | null;
  background_preset: string | null;
  background_image_url: string | null;
  card_bg_image_url: string | null;
  glass_opacity: number | null;
  font_family: string | null;
  text_alignment: string | null;
  card_blur: number | null;
  card_texture: string | null;
  availability_status: string | null;
  work_mode: string | null;
  show_availability: boolean | null;
  show_location: boolean | null;
  user_id: string;
}

interface ProfileData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  email_public: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  cv_url: string | null;
  card_accent_color: string | null;
  availability_status: string | null;
  work_mode: string | null;
  show_availability: boolean | null;
  show_location: boolean | null;
}

const PublicProfilePage = () => {
  const { username, personaSlug } = useParams<{ username: string; personaSlug?: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const cardScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.85]);
  const cardOpacity = useTransform(scrollYProgress, [0.2, 0.4], [1, 0.6]);
  const chevronOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  // Strip dashboard theme classes so the public page renders with its own palette
  useEffect(() => {
    const root = document.documentElement;
    const themeClasses = Array.from(root.classList).filter((c) => c.startsWith("theme-"));
    themeClasses.forEach((c) => root.classList.remove(c));
    root.classList.remove("dark");
    return () => {
      const stored = localStorage.getItem("admin_theme");
      if (stored) root.classList.add(`theme-${stored}`);
      const colorMode = localStorage.getItem("admin_color_mode");
      if (colorMode === "dark" || (!colorMode && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        root.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileErr || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as ProfileData);

      if (personaSlug) {
        const { data: personaData } = await supabase
          .from("personas")
          .select("*")
          .eq("user_id", profileData.user_id)
          .eq("slug", personaSlug)
          .single();

        if (personaData) setPersona(personaData as PersonaData);
      } else {
        const { data: activePer } = await supabase
          .from("personas")
          .select("*")
          .eq("user_id", profileData.user_id)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (activePer) setPersona(activePer as PersonaData);
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: profileData.user_id,
          interaction_type: "profile_view",
          metadata: {
            source: "public_landing",
            ua: navigator.userAgent,
            persona_slug: personaSlug || null,
          },
        }),
      }).catch(() => {});

      setLoading(false);
    };

    load();
  }, [username, personaSlug]);

  const merged = persona
    ? {
        display_name: persona.display_name || profile?.display_name,
        headline: persona.headline || profile?.headline,
        bio: persona.bio || profile?.bio,
        avatar_url: persona.avatar_url || profile?.avatar_url,
        email_public: persona.email_public || profile?.email_public,
        phone: persona.phone || profile?.phone,
        location: persona.location || profile?.location,
        website: persona.website || profile?.website,
        linkedin_url: persona.linkedin_url || profile?.linkedin_url,
        github_url: persona.github_url || profile?.github_url,
        cv_url: persona.cv_url || profile?.cv_url,
        accent_color: persona.accent_color || profile?.card_accent_color || "#0d9488",
        availability_status: persona.availability_status || profile?.availability_status,
        work_mode: persona.work_mode || profile?.work_mode,
        show_availability: persona.show_availability ?? profile?.show_availability,
        show_location: persona.show_location ?? profile?.show_location,
        user_id: profile?.user_id || "",
      }
    : {
        display_name: profile?.display_name,
        headline: profile?.headline,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        email_public: profile?.email_public,
        phone: profile?.phone,
        location: profile?.location,
        website: profile?.website,
        linkedin_url: profile?.linkedin_url,
        github_url: profile?.github_url,
        cv_url: profile?.cv_url,
        accent_color: profile?.card_accent_color || "#0d9488",
        availability_status: profile?.availability_status,
        work_mode: profile?.work_mode,
        show_availability: profile?.show_availability,
        show_location: profile?.show_location,
        user_id: profile?.user_id || "",
      };

  const handleDownloadVCard = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: merged.user_id,
        interaction_type: "vcard_download",
        metadata: { source: "public_landing", ua: navigator.userAgent },
      }),
    }).catch(() => {});

    downloadVCard({
      displayName: merged.display_name ?? undefined,
      email: merged.email_public ?? undefined,
      phone: merged.phone ?? undefined,
      website: merged.website ?? undefined,
      linkedin: merged.linkedin_url ?? undefined,
      github: merged.github_url ?? undefined,
      headline: merged.headline ?? undefined,
      location: merged.location ?? undefined,
    });
  };

  const handleDownloadCV = () => {
    if (!merged.cv_url) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: merged.user_id,
        interaction_type: "cv_download",
        metadata: { source: "public_landing", ua: navigator.userAgent },
      }),
    }).catch(() => {});
    window.open(merged.cv_url, "_blank");
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

  if (persona && !persona.is_active) {
    return <CardDisabledPage ownerName={merged.display_name || username || undefined} />;
  }

  if (persona?.is_private && !gateUnlocked) {
    return (
      <SecurityGate
        personaId={persona.id}
        ownerUserId={merged.user_id}
        ownerName={merged.display_name || username || ""}
        pinRequired={!persona.require_contact_exchange}
        contactRequired={persona.require_contact_exchange}
        accentColor={merged.accent_color}
        onUnlocked={() => setGateUnlocked(true)}
      />
    );
  }

  const accentColor = merged.accent_color;
  const landingBgColor = persona?.landing_bg_color || "#0a0a0f";
  const bgPresetCss = getPresetCss(persona?.background_preset);
  const bgImageUrl = persona?.background_image_url;
  const fontStack = getFontStack(persona?.font_family);
  const googleFontUrl = getGoogleFontUrl(persona?.font_family);

  return (
    <>
      {googleFontUrl && <link rel="stylesheet" href={googleFontUrl} />}
      <div ref={containerRef} className="relative" style={{ backgroundColor: landingBgColor, fontFamily: fontStack }}>
      {/* ── Hero Section: Full-screen 3D Card ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: bgImageUrl
            ? `url(${bgImageUrl})`
            : bgPresetCss !== "none"
            ? bgPresetCss
            : undefined,
          backgroundSize: bgImageUrl ? "cover" : undefined,
          backgroundPosition: bgImageUrl ? "center" : undefined,
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${accentColor}15, transparent 70%)`,
          }}
        />

        {/* Header badge */}
        <motion.div
          className="absolute top-6 flex items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: accentColor }}>
            <Wifi className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-display font-semibold tracking-widest uppercase" style={{ color: `${persona?.text_color ?? "#ffffff"}99` }}>
            NFC Hub
          </span>
          {persona && (
            <Badge variant="secondary" className="text-[10px] ml-1">{persona.label}</Badge>
          )}
        </motion.div>

        {/* 3D Card — flies up from below, then floats */}
        <motion.div
          className="w-full max-w-lg px-4"
          initial={{ opacity: 0, y: 200 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 22, mass: 1.2, delay: 0.1 }}
          style={{ scale: cardScale, opacity: cardOpacity }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <InteractiveCard3D
              name={merged.display_name ?? username ?? ""}
              headline={merged.headline ?? undefined}
              avatarUrl={merged.avatar_url ?? undefined}
              username={username ?? ""}
              accentColor={accentColor}
              secondaryColor={persona?.secondary_color ?? undefined}
              tertiaryColor={persona?.tertiary_color ?? undefined}
              textColor={persona?.text_color ?? "#ffffff"}
              cardBgImageUrl={persona?.card_bg_image_url ?? undefined}
              glassOpacity={persona?.glass_opacity ?? 0.15}
              linkedinUrl={merged.linkedin_url ?? undefined}
              githubUrl={merged.github_url ?? undefined}
              website={merged.website ?? undefined}
              email={merged.email_public ?? undefined}
              fontFamily={persona?.font_family ?? "Space Grotesk"}
              textAlignment={persona?.text_alignment ?? "left"}
              cardBlur={persona?.card_blur ?? 12}
              cardTexture={persona?.card_texture ?? "none"}
            />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-1"
          style={{ opacity: chevronOpacity, color: `${persona?.text_color ?? "#ffffff"}66` }}
        >
          <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Details Section: scrolls in from below ── */}
      <section className="relative z-10 bg-background">
        <div className="max-w-lg mx-auto px-4 pb-16 pt-12 space-y-6">
          {/* Identity */}
          <motion.div
            className="text-center space-y-2"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            {merged.avatar_url && (
              <img
                src={merged.avatar_url}
                alt={merged.display_name ?? "Avatar"}
                className="w-20 h-20 rounded-full mx-auto border-2 border-border object-cover"
                loading="lazy"
              />
            )}
            <h1 className="text-2xl font-display font-bold">{merged.display_name}</h1>
            {merged.headline && <p className="text-muted-foreground">{merged.headline}</p>}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {merged.show_availability && (
                <Badge variant="default" className="gradient-primary text-primary-foreground border-0">
                  {merged.availability_status ?? "Available"}
                </Badge>
              )}
              {merged.work_mode && <Badge variant="secondary">{merged.work_mode}</Badge>}
            </div>
          </motion.div>

          {/* Bio */}
          {merged.bio && (
            <motion.div
              className="glass-card rounded-lg p-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <p className="text-sm leading-relaxed text-foreground/90">{merged.bio}</p>
            </motion.div>
          )}

          {/* Contact links */}
          <motion.div
            className="glass-card rounded-lg divide-y divide-border/60 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {merged.show_location && merged.location && (
              <ContactRow icon={<MapPin className="w-4 h-4" />} label={merged.location} />
            )}
            {merged.email_public && (
              <ContactRow icon={<Mail className="w-4 h-4" />} label={merged.email_public} href={`mailto:${merged.email_public}`} />
            )}
            {merged.phone && (
              <ContactRow icon={<Phone className="w-4 h-4" />} label={merged.phone} href={`tel:${merged.phone}`} />
            )}
            {merged.website && (
              <ContactRow icon={<Globe className="w-4 h-4" />} label={merged.website} href={merged.website} external />
            )}
            {merged.linkedin_url && (
              <ContactRow icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" href={merged.linkedin_url} external />
            )}
            {merged.github_url && (
              <ContactRow icon={<Github className="w-4 h-4" />} label="GitHub" href={merged.github_url} external />
            )}
          </motion.div>

          {/* Actions */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button onClick={handleDownloadVCard} className="w-full gradient-primary text-primary-foreground h-12">
              <UserPlus className="w-4 h-4 mr-2" /> Save Contact
            </Button>
            {merged.cv_url && (
              <Button onClick={handleDownloadCV} variant="outline" className="w-full h-12">
                <FileText className="w-4 h-4 mr-2" /> Download CV / Resume
              </Button>
            )}
          </motion.div>

          <p className="text-center text-xs text-muted-foreground pt-4">
            Powered by <span className="font-display font-semibold">NFC Hub</span>
          </p>
        </div>
      </section>
    </div>
    </>
  );
};

function ContactRow({ icon, label, href, external }: { icon: React.ReactNode; label: string; href?: string; external?: boolean }) {
  const cls = "flex items-center gap-3 p-3.5 hover:bg-accent/40 transition-colors";
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls}>
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-sm truncate">{label}</span>
      </a>
    );
  }
  return (
    <div className={cls}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default PublicProfilePage;
