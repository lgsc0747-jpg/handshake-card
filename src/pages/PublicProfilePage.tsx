import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { SecurityGate } from "@/components/SecurityGate";
import { ContactMeModal } from "@/components/ContactMeModal";
import { CardDisabledPage } from "@/components/CardDisabledPage";

import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { PublicPageNav } from "@/components/page-builder/PublicPageNav";

import type { PageBlock } from "@/components/page-builder/types";
import { downloadVCard } from "@/lib/vcard";
import { getPresetCss } from "@/components/DesignStudio/BackgroundPresets";
import { getFontStack, getGoogleFontUrl } from "@/components/DesignStudio/FontPresets";
import { PAGE_THEMES, getPageThemeStyles, PAGE_THEME_CLASS } from "@/contexts/PageBuilderThemeContext";
import { cn } from "@/lib/utils";
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
  has_pin: boolean;
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
  card_bg_size: string | null;
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
  avatar_position?: { x: number; y: number; scale: number } | null;
  card_bg_position?: { x: number; y: number; scale: number } | null;
  bg_image_position?: { x: number; y: number; scale: number } | null;
  page_mode?: string | null;
}

interface ProfileData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  card_accent_color: string | null;
  availability_status: string | null;
  work_mode: string | null;
  show_availability: boolean | null;
  show_location: boolean | null;
}

interface SectionData {
  section_type: string;
  sort_order: number;
  is_visible: boolean;
}

const PublicProfilePage = () => {
  const { username, personaSlug } = useParams<{ username: string; personaSlug?: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>([]);
  const [hasPageBuilder, setHasPageBuilder] = useState(false);
  const [sitePages, setSitePages] = useState<{ id: string; title: string; slug: string; is_homepage: boolean; page_icon: string | null }[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [ownerIsPro, setOwnerIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [pageThemeId, setPageThemeId] = useState<string>("default");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const cardScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.85]);
  const cardOpacity = useTransform(scrollYProgress, [0.2, 0.4], [1, 0.6]);
  const chevronOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  // Track scroll for floating Contact Me CTA
  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      const { data: profileRows, error: profileErr } = await (supabase.rpc as any)("get_public_profile", {
        p_username: username,
      });

      const profileData = Array.isArray(profileRows) ? profileRows[0] : profileRows;
      if (profileErr || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as ProfileData);

      const { data: proData } = await (supabase.rpc as any)("is_user_pro", {
        p_user_id: profileData.user_id,
      });
      setOwnerIsPro(proData === true);

      const { data: personaRows } = await (supabase.rpc as any)("get_public_persona", {
        p_user_id: profileData.user_id,
        p_slug: personaSlug || null,
      });

      const personaData = Array.isArray(personaRows) ? personaRows[0] : personaRows;
      if (personaData) {
        setPersona(personaData as PersonaData);
        // Load page theme from persona data (stored in DB)
        if ((personaData as any).page_theme) setPageThemeId((personaData as any).page_theme);
        // persona data loaded from RPC

        // Load sections
        const { data: sectionData } = await supabase
          .from("persona_sections")
          .select("section_type, sort_order, is_visible")
          .eq("persona_id", personaData.id)
          .order("sort_order");
        if (sectionData && sectionData.length > 0) {
          setSections(sectionData as SectionData[]);
        } else {
          setSections([
            { section_type: "hero", sort_order: 0, is_visible: true },
            { section_type: "nfc_card", sort_order: 1, is_visible: true },
            
            { section_type: "contact", sort_order: 3, is_visible: true },
            { section_type: "social_grid", sort_order: 4, is_visible: true },
          ]);
        }

        // Load all site pages for this persona
        const { data: allSitePages } = await supabase
          .from("site_pages")
          .select("id, title, slug, is_homepage, page_icon")
          .eq("persona_id", personaData.id)
          .eq("is_visible", true)
          .order("sort_order");

        if (allSitePages && allSitePages.length > 0) {
          setSitePages(allSitePages);
          const homepage = allSitePages.find(p => p.is_homepage) || allSitePages[0];
          setActivePageId(homepage.id);

          // Load blocks for homepage
          const { data: blockData } = await supabase
            .from("page_blocks")
            .select("*")
            .eq("page_id", homepage.id)
            .eq("is_visible", true)
            .order("sort_order");
          if (blockData && blockData.length > 0) {
            setPageBlocks(blockData as PageBlock[]);
            setHasPageBuilder(true);
          }
        }
      }

      // Track visit
      const visitorKey = `nfc_visitor_${profileData.user_id}`;
      const visitHistory = JSON.parse(localStorage.getItem(visitorKey) || "[]");
      const isReturn = visitHistory.length > 0;
      visitHistory.push(new Date().toISOString());
      localStorage.setItem(visitorKey, JSON.stringify(visitHistory.slice(-20)));

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const visitorId = localStorage.getItem("nfc_visitor_id") || `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("nfc_visitor_id", visitorId);

      const nav = navigator as any;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      const connectionType = conn?.effectiveType || conn?.type || "unknown";
      const isBrave = (nav.brave && typeof nav.brave.isBrave === "function") ? true : false;

      fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: profileData.user_id,
          interaction_type: "profile_view",
          metadata: {
            source: "public_landing",
            ua: navigator.userAgent + (isBrave ? " Brave" : ""),
            persona_slug: personaSlug || null,
            visitor_id: visitorId,
            is_return: isReturn,
            visit_count: visitHistory.length,
            connection_type: connectionType,
          },
        }),
      }).catch(() => {});

      const startTime = Date.now();
      const handleUnload = () => {
        const seconds = Math.round((Date.now() - startTime) / 1000);
        if (seconds > 2) {
          const blob = new Blob([JSON.stringify({
            target_user_id: profileData.user_id,
            interaction_type: "dwell_time",
            metadata: { seconds, ua: navigator.userAgent, persona_slug: personaSlug || null },
          })], { type: "application/json" });
          navigator.sendBeacon(
            `https://${projectId}.supabase.co/functions/v1/log-interaction`,
            blob
          );
        }
      };
      window.addEventListener("beforeunload", handleUnload);

      setLoading(false);
      return () => window.removeEventListener("beforeunload", handleUnload);
    };

    load();
  }, [username, personaSlug]);

  const merged = persona
    ? {
        display_name: persona.display_name || profile?.display_name,
        headline: persona.headline || profile?.headline,
        bio: persona.bio || profile?.bio,
        avatar_url: persona.avatar_url || profile?.avatar_url,
        email_public: persona.email_public || null,
        phone: persona.phone || null,
        location: persona.location || profile?.location,
        website: persona.website || profile?.website,
        linkedin_url: persona.linkedin_url || profile?.linkedin_url,
        github_url: persona.github_url || profile?.github_url,
        cv_url: persona.cv_url || null,
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
        email_public: null as string | null,
        phone: null as string | null,
        location: profile?.location,
        website: profile?.website,
        linkedin_url: profile?.linkedin_url,
        github_url: profile?.github_url,
        cv_url: null as string | null,
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

  const trackLinkClick = useCallback((linkType: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: merged.user_id,
        interaction_type: "link_click",
        metadata: { link_type: linkType, ua: navigator.userAgent, persona_slug: persona?.slug },
      }),
    }).catch(() => {});
  }, [merged.user_id, persona?.slug]);

  const handlePageChange = useCallback(async (pageId: string) => {
    setActivePageId(pageId);
    const { data: blockData } = await supabase
      .from("page_blocks")
      .select("*")
      .eq("page_id", pageId)
      .eq("is_visible", true)
      .order("sort_order");
    setPageBlocks((blockData as PageBlock[]) ?? []);

    // Track page navigation
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const page = sitePages.find(p => p.id === pageId);
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: merged.user_id,
        interaction_type: "page_view",
        metadata: { page_slug: page?.slug, page_title: page?.title, ua: navigator.userAgent, persona_slug: persona?.slug },
      }),
    }).catch(() => {});
  }, [merged.user_id, persona?.slug, sitePages]);

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

  const trackCardFlip = useCallback(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: merged.user_id,
        interaction_type: "card_flip",
        metadata: { ua: navigator.userAgent, persona_slug: persona?.slug },
      }),
    }).catch(() => {});
  }, [merged.user_id, persona?.slug]);

  const pageThemeStyles = useMemo(() => getPageThemeStyles(pageThemeId), [pageThemeId]);

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

  if (persona?.is_private && persona?.has_pin && !gateUnlocked) {
    return (
      <SecurityGate
        personaId={persona.id}
        ownerUserId={merged.user_id}
        ownerName={merged.display_name || username || ""}
        pinRequired={true}
        contactRequired={false}
        accentColor={merged.accent_color}
        onUnlocked={() => setGateUnlocked(true)}
      />
    );
  }

  const accentColor = merged.accent_color;
  const rawTextColor = persona?.text_color ?? "#ffffff";
  // If a page theme is active and has --page-text, use that for readability
  const themeTextColor = pageThemeId !== "default" ? (pageThemeStyles as any)["--page-text"] : null;
  const textColor = themeTextColor || rawTextColor;
  const landingBgColor = persona?.landing_bg_color || "#0a0a0f";
  const bgPresetCss = getPresetCss(persona?.background_preset);
  const bgImageUrl = persona?.background_image_url;
  const fontStack = getFontStack(persona?.font_family);
  const googleFontUrl = getGoogleFontUrl(persona?.font_family);

  const visibleSections = sections.filter(s => s.is_visible).sort((a, b) => a.sort_order - b.sort_order);

  // Section renderers
  const renderHero = () => (
    <motion.div
      className="text-center space-y-2"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
    >
      {merged.avatar_url && (() => {
        const ap = persona?.avatar_position as any;
        const pos = ap ? { x: ap.x ?? 50, y: ap.y ?? 50, scale: ap.scale ?? 100 } : { x: 50, y: 50, scale: 100 };
        return (
          <div className="w-20 h-20 rounded-full mx-auto border-2 border-white/20 overflow-hidden">
            <img
              src={merged.avatar_url}
              alt={merged.display_name ?? "Avatar"}
              className="w-full h-full"
              loading="lazy"
              style={{
                objectFit: "cover",
                objectPosition: `${pos.x}% ${pos.y}%`,
                transform: `scale(${pos.scale / 100})`,
                transformOrigin: `${pos.x}% ${pos.y}%`,
              }}
            />
          </div>
        );
      })()}
      <h1 className="text-2xl font-display font-bold" style={{ color: textColor }}>{merged.display_name}</h1>
      {merged.headline && <p style={{ color: `${textColor}99` }}>{merged.headline}</p>}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {merged.show_availability && (
          <Badge className="border-0 text-xs" style={{ backgroundColor: accentColor, color: "#fff" }}>
            {merged.availability_status ?? "Available"}
          </Badge>
        )}
        {merged.work_mode && (
          <Badge variant="secondary" className="bg-white/10 text-white/80 border-0 text-xs">
            {merged.work_mode}
          </Badge>
        )}
      </div>
      {merged.bio && (
        <div className="mt-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
          <p className="text-sm leading-relaxed" style={{ color: `${textColor}dd` }}>{merged.bio}</p>
        </div>
      )}
    </motion.div>
  );

  const renderNfcCard = () => (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundImage: bgImageUrl
          ? `url(${bgImageUrl})`
          : bgPresetCss !== "none"
          ? bgPresetCss
          : undefined,
        backgroundSize: bgImageUrl ? "cover" : undefined,
        backgroundPosition: bgImageUrl
          ? (() => {
              const bp = persona?.bg_image_position as any;
              return bp ? `${bp.x ?? 50}% ${bp.y ?? 50}%` : "center";
            })()
          : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${accentColor}15, transparent 70%)` }}
      />

      <motion.div
        className="absolute top-6 flex items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accentColor }}>
          <Wifi className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-display font-semibold tracking-widest uppercase" style={{ color: `${textColor}99` }}>
          Handshake
        </span>
        {persona && <Badge variant="secondary" className="text-[10px] ml-1 bg-white/10 text-white/70 border-0">{persona.label}</Badge>}
      </motion.div>

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
            textColor={textColor}
            cardBgImageUrl={persona?.card_bg_image_url ?? undefined}
            cardBgSize={(persona as any)?.card_bg_size ?? "cover"}
            avatarPosition={persona?.avatar_position as any}
            cardBgPosition={persona?.card_bg_position as any}
            glassOpacity={persona?.glass_opacity ?? 0.15}
            linkedinUrl={merged.linkedin_url ?? undefined}
            githubUrl={merged.github_url ?? undefined}
            website={merged.website ?? undefined}
            email={merged.email_public ?? undefined}
            fontFamily={persona?.font_family ?? "Space Grotesk"}
            textAlignment={persona?.text_alignment ?? "left"}
            cardBlur={persona?.card_blur ?? 12}
            cardTexture={persona?.card_texture ?? "none"}
            borderRadius={(persona as any)?.border_radius ?? 24}
            onFlipToBack={trackCardFlip}
            onLinkClick={trackLinkClick}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 flex flex-col items-center gap-1"
        style={{ opacity: chevronOpacity, color: `${textColor}66` }}
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
  );


  const renderContact = () => (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {/* Contact links */}
      <div className="rounded-2xl divide-y divide-white/10 overflow-hidden bg-white/5 backdrop-blur-md border border-white/10">
        {merged.show_location && merged.location && (
          <ContactRow icon={<MapPin className="w-4 h-4" />} label={merged.location} textColor={textColor} />
        )}
        {merged.email_public && (
          <ContactRow icon={<Mail className="w-4 h-4" />} label={merged.email_public} href={`mailto:${merged.email_public}`} textColor={textColor} onClick={() => trackLinkClick("email")} />
        )}
        {merged.phone && (
          <ContactRow icon={<Phone className="w-4 h-4" />} label={merged.phone} href={`tel:${merged.phone}`} textColor={textColor} onClick={() => trackLinkClick("phone")} />
        )}
        {merged.website && (
          <ContactRow icon={<Globe className="w-4 h-4" />} label={merged.website} href={merged.website} external textColor={textColor} onClick={() => trackLinkClick("website")} />
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {persona && (
          <Button
            onClick={() => setContactModalOpen(true)}
            className="w-full h-12 rounded-2xl text-sm font-semibold border-2"
            variant="outline"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            <Mail className="w-4 h-4 mr-2" /> Contact Me
          </Button>
        )}
        <Button
          onClick={handleDownloadVCard}
          className="w-full h-12 rounded-2xl text-sm font-semibold"
          style={{ backgroundColor: accentColor, color: "#fff" }}
        >
          <UserPlus className="w-4 h-4 mr-2" /> Save Contact
        </Button>
        {merged.cv_url && (
          <Button onClick={handleDownloadCV} variant="outline" className="w-full h-12 rounded-2xl border-white/20 text-sm" style={{ color: textColor }}>
            <FileText className="w-4 h-4 mr-2" /> Download CV / Resume
          </Button>
        )}
      </div>
    </motion.div>
  );

  const renderSocialGrid = () => {
    const socials = [
      merged.linkedin_url && { icon: Linkedin, href: merged.linkedin_url, label: "LinkedIn", type: "linkedin" },
      merged.github_url && { icon: Github, href: merged.github_url, label: "GitHub", type: "github" },
      merged.website && { icon: Globe, href: merged.website, label: "Website", type: "website" },
    ].filter(Boolean) as { icon: any; href: string; label: string; type: string }[];

    if (socials.length === 0) return null;

    return (
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: `${textColor}66` }}>Connect</h3>
        <div className="grid grid-cols-3 gap-3">
          {socials.map((s) => (
            <a
              key={s.type}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackLinkClick(s.type)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
            >
              <s.icon className="w-5 h-5" style={{ color: accentColor }} />
              <span className="text-[10px] font-medium" style={{ color: `${textColor}99` }}>{s.label}</span>
            </a>
          ))}
        </div>
      </motion.div>
    );
  };

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    hero: renderHero,
    nfc_card: renderNfcCard,
    
    contact: renderContact,
    social_grid: renderSocialGrid,
  };

  // Find the NFC card section index for full-bleed rendering
  const nfcCardIdx = visibleSections.findIndex(s => s.section_type === "nfc_card");

  const hasPageTheme = pageThemeId !== "default" && Object.keys(pageThemeStyles).length > 0;

  return (
    <>
      {googleFontUrl && <link rel="stylesheet" href={googleFontUrl} />}
      <div
        ref={containerRef}
        className={cn("relative", hasPageTheme && PAGE_THEME_CLASS)}
        style={{
          backgroundColor: hasPageTheme ? (pageThemeStyles as any)["--page-bg"] || landingBgColor : landingBgColor,
          fontFamily: hasPageTheme ? (pageThemeStyles as any)["--page-font"] || fontStack : fontStack,
          color: hasPageTheme ? (pageThemeStyles as any)["--page-text"] : undefined,
          ...pageThemeStyles,
        }}
      >
        {/* Multi-page navigation */}
        {hasPageBuilder && sitePages.length > 1 && activePageId && (
          <PublicPageNav
            pages={sitePages}
            activePageId={activePageId}
            onPageChange={handlePageChange}
            accentColor={accentColor}
            textColor={textColor}
          />
        )}

        {/* Route based on page_mode: builder = page blocks, personal/default = legacy card fly-up */}
        {persona?.page_mode === 'builder' && hasPageBuilder ? (
          <div style={{
            color: hasPageTheme ? (pageThemeStyles as any)["--page-text"] || textColor : textColor,
            ...(hasPageTheme ? pageThemeStyles : {}),
          }}>
            {pageBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} persona={persona} onTrackInteraction={(type, metadata) => {
                const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    target_user_id: merged.user_id,
                    interaction_type: type,
                    metadata: { ...metadata, ua: navigator.userAgent, persona_slug: persona?.slug },
                  }),
                }).catch(() => {});
              }} />
            ))}
          </div>
        ) : (
          visibleSections.map((section, idx) => {
            const renderer = sectionRenderers[section.section_type];
            if (!renderer) return null;

            if (section.section_type === "nfc_card") {
              return <div key={section.section_type}>{renderer()}</div>;
            }

            return (
              <section key={section.section_type} className="relative z-10" style={{ backgroundColor: landingBgColor }}>
                <div className="max-w-lg mx-auto px-4 py-8">
                  {renderer()}
                </div>
              </section>
            );
          })
        )}

        {/* Branding */}
        {!ownerIsPro && (
          <div className="max-w-lg mx-auto px-4 pb-8">
            <p className="text-center text-xs" style={{ color: `${textColor}44` }}>
              Powered by <span className="font-display font-semibold">Handshake</span>
            </p>
          </div>
        )}
      </div>

      {/* Floating Contact Me CTA */}
      {persona && scrolledPastHero && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Button
            onClick={() => setContactModalOpen(true)}
            className="h-12 px-5 rounded-2xl text-sm font-semibold shadow-lg"
            style={{ backgroundColor: accentColor, color: "#fff", boxShadow: `0 8px 30px ${accentColor}40` }}
          >
            <Mail className="w-4 h-4 mr-2" /> Contact Me
          </Button>
        </motion.div>
      )}

      {/* Contact Me Modal */}
      {persona && (
        <ContactMeModal
          open={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          personaId={persona.id}
          ownerUserId={merged.user_id}
          ownerName={merged.display_name || username || ""}
          accentColor={accentColor}
        />
      )}
    </>
  );
};

function ContactRow({ icon, label, href, external, textColor, onClick }: {
  icon: React.ReactNode; label: string; href?: string; external?: boolean; textColor: string; onClick?: () => void;
}) {
  const cls = "flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors";
  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cls}
        onClick={onClick}
      >
        <span style={{ color: `${textColor}66` }} className="shrink-0">{icon}</span>
        <span className="text-sm truncate" style={{ color: textColor }}>{label}</span>
      </a>
    );
  }
  return (
    <div className={cls}>
      <span style={{ color: `${textColor}66` }} className="shrink-0">{icon}</span>
      <span className="text-sm" style={{ color: textColor }}>{label}</span>
    </div>
  );
}

export default PublicProfilePage;
