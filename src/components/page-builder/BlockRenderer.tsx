import type { PageBlock } from "./types";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, Linkedin, Github, Twitter, Instagram, Facebook, Youtube, ExternalLink, MapPin, Quote as QuoteIcon, Star, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { PublicProductGrid } from "@/components/commerce/PublicProductGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ANIMATION_PRESETS: Record<string, { initial: any; animate: any; transition: any }> = {
  none: { initial: {}, animate: {}, transition: {} },
  "fade-up": {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  "fade-down": {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  "slide-left": {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  "slide-right": {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  "scale-spring": {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  "scale-bounce": {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
  "blur-in": {
    initial: { opacity: 0, filter: "blur(12px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  "flip-up": {
    initial: { opacity: 0, rotateX: -15, y: 20 },
    animate: { opacity: 1, rotateX: 0, y: 0 },
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

export const ANIMATION_OPTIONS = Object.keys(ANIMATION_PRESETS);

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold: 0.15 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

interface BlockRendererProps {
  block: PageBlock;
  isEditing?: boolean;
  onClick?: () => void;
  persona?: any;
}

export function BlockRenderer({ block, isEditing, onClick, persona }: BlockRendererProps) {
  const { block_type, content, styles } = block;
  const animRef = useRef<HTMLDivElement>(null);
  const inView = useInView(animRef);
  const animKey = (styles.animation as string) ?? "none";
  const anim = ANIMATION_PRESETS[animKey] ?? ANIMATION_PRESETS.none;
  const shouldAnimate = !isEditing && animKey !== "none";

  const wrapperStyle: React.CSSProperties = {
    paddingTop: styles.paddingY ?? 24,
    paddingBottom: styles.paddingY ?? 24,
    paddingLeft: styles.paddingX ?? 16,
    paddingRight: styles.paddingX ?? 16,
    backgroundColor: styles.bgTransparencyEnabled && styles.bgColor
      ? (() => {
          const opacity = (styles.bgOpacity ?? 100) / 100;
          const c = styles.bgColor;
          if (c.startsWith("rgba")) return c.replace(/[\d.]+\)$/, `${opacity})`);
          if (c.startsWith("rgb")) return c.replace("rgb(", "rgba(").replace(")", `,${opacity})`);
          if (c.startsWith("#")) {
            const hex = c.slice(1);
            const r = parseInt(hex.length === 3 ? hex[0]+hex[0] : hex.slice(0,2), 16);
            const g = parseInt(hex.length === 3 ? hex[1]+hex[1] : hex.slice(2,4), 16);
            const b = parseInt(hex.length === 3 ? hex[2]+hex[2] : hex.slice(4,6), 16);
            return `rgba(${r},${g},${b},${opacity})`;
          }
          return c;
        })()
      : (styles.bgColor ?? "transparent"),
    borderRadius: styles.borderRadius ?? 0,
    textAlign: (styles.alignment ?? "left") as any,
    maxWidth: styles.maxWidth ?? "100%",
    margin: "0 auto",
    ...(shouldAnimate && !inView ? styleFromMotion(anim.initial) : {}),
    ...(shouldAnimate && inView ? { ...styleFromMotion(anim.animate), transition: cssTransition(anim.transition) } : {}),
  };

  const editOverlay = isEditing ? (
    <div
      className="absolute inset-0 border-2 border-dashed border-transparent hover:border-primary/40 rounded-lg cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-md">
        Edit
      </div>
    </div>
  ) : null;

  switch (block_type) {
    case "heading":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          <h2
            className="font-display font-bold leading-tight"
            style={{
              fontSize: content.fontSize ?? 32,
              color: styles.textColor ?? "inherit",
            }}
          >
            {content.text || "Heading"}
          </h2>
          {content.subtitle && (
            <p className="mt-2 text-muted-foreground" style={{ fontSize: (content.fontSize ?? 32) * 0.45 }}>
              {content.subtitle}
            </p>
          )}
        </div>
      );

    case "text":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div
            className="leading-relaxed whitespace-pre-wrap"
            style={{
              fontSize: content.fontSize ?? 16,
              color: styles.textColor ?? "inherit",
              lineHeight: content.lineHeight ?? 1.7,
            }}
          >
            {content.text || "Your text goes here. Click to edit and add your content."}
          </div>
        </div>
      );

    case "image":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          {content.url ? (
            <img
              src={content.url}
              alt={content.alt ?? ""}
              className="w-full object-cover"
              style={{
                borderRadius: styles.imageRadius ?? 12,
                maxHeight: content.maxHeight ?? 400,
              }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-muted/30 border-2 border-dashed border-border"
              style={{ height: 200, borderRadius: styles.imageRadius ?? 12 }}
            >
              <span className="text-sm text-muted-foreground">Click to add image</span>
            </div>
          )}
          {content.caption && (
            <p className="text-xs text-muted-foreground mt-2 text-center">{content.caption}</p>
          )}
        </div>
      );

    case "gallery":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${content.columns ?? 3}, 1fr)` }}
          >
            {(content.images ?? []).length > 0 ? (
              (content.images as { url: string; alt?: string }[]).map((img, i) => (
                <img key={i} src={img.url} alt={img.alt ?? ""} className="w-full aspect-square object-cover rounded-xl" />
              ))
            ) : (
              Array.from({ length: content.columns ?? 3 }).map((_, i) => (
                <div key={i} className="w-full aspect-square bg-muted/30 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Image {i + 1}</span>
                </div>
              ))
            )}
          </div>
        </div>
      );

    case "video":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          {content.url ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden">
              <iframe
                src={content.url.replace("watch?v=", "embed/")}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-muted/30 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Paste a YouTube or video URL</span>
            </div>
          )}
        </div>
      );

    case "spacer":
      return (
        <div ref={animRef} className="relative" style={{ height: content.height ?? 48 }}>
          {editOverlay}
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[9px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{content.height ?? 48}px</div>
            </div>
          )}
        </div>
      );

    case "divider":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <hr
            className="border-0"
            style={{
              height: content.thickness ?? 1,
              background: styles.lineColor ?? "hsl(var(--border))",
              borderRadius: 999,
            }}
          />
        </div>
      );

    case "button":
      return (
        <div ref={animRef} className="relative flex" style={{ ...wrapperStyle, justifyContent: styles.alignment === "center" ? "center" : styles.alignment === "right" ? "flex-end" : "flex-start" }}>
          {editOverlay}
          <a href={content.url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button
              size="lg"
              className="rounded-xl font-semibold"
              style={{
                background: styles.buttonColor ?? "hsl(var(--primary))",
                color: styles.buttonTextColor ?? "hsl(var(--primary-foreground))",
                fontSize: content.fontSize ?? 14,
              }}
            >
              {content.text || "Click Me"}
              {content.showArrow && <ExternalLink className="w-4 h-4 ml-2" />}
            </Button>
          </a>
        </div>
      );

    case "quote":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <blockquote className="relative pl-6 border-l-4" style={{ borderColor: styles.accentColor ?? "hsl(var(--primary))" }}>
            <QuoteIcon className="absolute -left-2 -top-2 w-8 h-8 opacity-10" />
            <p className="text-lg italic leading-relaxed" style={{ color: styles.textColor ?? "inherit" }}>
              "{content.text || "Your inspirational quote here."}"
            </p>
            {content.author && (
              <footer className="mt-3 text-sm text-muted-foreground font-medium">— {content.author}</footer>
            )}
          </blockquote>
        </div>
      );

    case "team":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/60 backdrop-blur-sm">
            {content.photoUrl ? (
              <img src={content.photoUrl} alt={content.name ?? ""} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted/50 shrink-0" />
            )}
            <div>
              <h3 className="font-semibold text-sm">{content.name || "Team Member"}</h3>
              <p className="text-xs text-muted-foreground">{content.role || "Role / Title"}</p>
              {content.description && <p className="text-xs mt-1 opacity-70">{content.description}</p>}
            </div>
          </div>
        </div>
      );

    case "stats":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(content.items ?? [{ value: "100+", label: "Customers" }, { value: "50K", label: "Sales" }, { value: "4.9", label: "Rating" }]).map((item: { value: string; label: string }, i: number) => (
              <div key={i} className="text-center p-4 rounded-xl bg-card/50 border border-border/40">
                <div className="text-2xl font-bold" style={{ color: styles.accentColor ?? "hsl(var(--primary))" }}>{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="p-5 rounded-2xl bg-card/50 border border-border/60 backdrop-blur-sm">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: content.rating ?? 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm italic leading-relaxed">"{content.text || "Amazing experience!"}"</p>
            <div className="flex items-center gap-3 mt-4">
              {content.avatarUrl && <img src={content.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
              <div>
                <p className="text-xs font-semibold">{content.name || "Customer"}</p>
                {content.company && <p className="text-[10px] text-muted-foreground">{content.company}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    case "faq": {
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="space-y-2">
            {(content.items ?? [{ q: "Question?", a: "Answer goes here." }]).map((item: { q: string; a: string }, i: number) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      );
    }

    case "icon_grid":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="grid grid-cols-3 gap-4">
            {(content.items ?? [{ icon: "🚀", label: "Fast" }, { icon: "🔒", label: "Secure" }, { icon: "🎨", label: "Beautiful" }]).map((item: { icon: string; label: string; description?: string }, i: number) => (
              <div key={i} className="text-center p-4 rounded-xl bg-card/30 border border-border/40">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs font-semibold">{item.label}</div>
                {item.description && <div className="text-[10px] text-muted-foreground mt-1">{item.description}</div>}
              </div>
            ))}
          </div>
        </div>
      );

    case "products": {
      const pId = persona?.id;
      const sellerId = persona?.user_id;
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          {pId && sellerId ? (
            <PublicProductGrid
              personaId={pId}
              sellerUserId={sellerId}
              accentColor={persona?.accent_color ?? "hsl(var(--primary))"}
              textColor={styles.textColor}
              gcashQrUrl={persona?.gcash_qr_url}
            />
          ) : (
            <div className="text-center p-8 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-sm text-muted-foreground">📦 Product grid — add persona data to load products</span>
            </div>
          )}
        </div>
      );
    }

    case "nfc_card": {
      const cardScale = content.cardScale ?? 0.95;
      const cardMaxWidth = content.cardMaxWidth ?? "420px";
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          {persona ? (
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <div style={{ transform: `scale(${cardScale})`, transformOrigin: "center", maxWidth: cardMaxWidth, width: "100%" }}>
                <InteractiveCard3D
                  name={persona.display_name ?? "Your Name"}
                  headline={persona.headline ?? undefined}
                  avatarUrl={persona.avatar_url ?? undefined}
                  username={persona.slug ?? ""}
                  accentColor={persona.accent_color ?? "#0d9488"}
                  secondaryColor={persona.secondary_color ?? undefined}
                  tertiaryColor={persona.tertiary_color ?? undefined}
                  textColor={persona.text_color ?? "#ffffff"}
                  cardBgImageUrl={persona.card_bg_image_url ?? undefined}
                  cardBgSize={persona.card_bg_size ?? "cover"}
                  glassOpacity={persona.glass_opacity ?? 0.15}
                  linkedinUrl={persona.linkedin_url ?? undefined}
                  githubUrl={persona.github_url ?? undefined}
                  website={persona.website ?? undefined}
                  email={persona.email_public ?? undefined}
                  fontFamily={persona.font_family ?? "Space Grotesk"}
                  textAlignment={persona.text_alignment ?? "left"}
                  cardBlur={persona.card_blur ?? 12}
                  cardTexture={persona.card_texture ?? "none"}
                  borderRadius={persona.border_radius ?? 24}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-8 rounded-xl bg-muted/20 border border-border/40">
              <span className="text-sm text-muted-foreground">💳 3D NFC Card — add persona data to render</span>
            </div>
          )}
        </div>
      );
    }

    case "contact":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <ContactFormBlock content={content} isEditing={isEditing} persona={persona} />
        </div>
      );

    case "social": {
      const links = content.links ?? [];
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="flex flex-wrap gap-3 justify-center">
            {links.length > 0 ? links.map((l: { platform: string; url: string }, i: number) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl bg-card/50 border border-border/60 flex items-center justify-center hover:border-primary/50 transition-colors">
                <span className="text-sm">{getSocialIcon(l.platform)}</span>
              </a>
            )) : (
              <div className="text-sm text-muted-foreground">Add your social links</div>
            )}
          </div>
        </div>
      );
    }

    case "embed":
      return (
        <div ref={animRef} className="relative" style={wrapperStyle}>
          {editOverlay}
          {content.html ? (
            <div dangerouslySetInnerHTML={{ __html: content.html }} />
          ) : (
            <div className="p-6 text-center bg-muted/20 rounded-xl border border-border/40">
              <span className="text-sm text-muted-foreground">Paste HTML embed code</span>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="p-4 text-sm text-muted-foreground">Unknown block type: {block_type}</div>
      );
  }
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left text-sm font-medium">
        {question}
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-muted-foreground">{answer}</div>}
    </div>
  );
}

function getSocialIcon(platform: string) {
  const map: Record<string, string> = {
    twitter: "𝕏", facebook: "f", instagram: "📸", youtube: "▶", linkedin: "in", github: "⌨", tiktok: "♪",
  };
  return map[platform.toLowerCase()] ?? "🔗";
}

function styleFromMotion(m: Record<string, any>): React.CSSProperties {
  const s: any = {};
  const transforms: string[] = [];
  for (const [k, v] of Object.entries(m)) {
    if (k === "opacity") s.opacity = v;
    else if (k === "filter") s.filter = v;
    else if (k === "x") transforms.push(`translateX(${v}px)`);
    else if (k === "y") transforms.push(`translateY(${v}px)`);
    else if (k === "scale") transforms.push(`scale(${v})`);
    else if (k === "rotateX") transforms.push(`rotateX(${v}deg)`);
  }
  if (transforms.length) s.transform = transforms.join(" ");
  return s;
}

function cssTransition(t: Record<string, any>): string {
  if (t.type === "spring") {
    const dur = 0.6;
    return `all ${dur}s cubic-bezier(0.34, 1.56, 0.64, 1)`;
  }
  const dur = t.duration ?? 0.5;
  return `all ${dur}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
}

function ContactFormBlock({ content, isEditing, persona }: { content: Record<string, any>; isEditing?: boolean; persona?: any }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email || !persona?.id || !persona?.user_id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lead_captures").insert({
        owner_user_id: persona.user_id,
        persona_id: persona.id,
        visitor_name: name || null,
        visitor_email: email,
        visitor_phone: phone || null,
        visitor_company: company || null,
        visitor_message: message || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Message sent successfully!");
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-5 rounded-2xl bg-card/50 border border-border/60 text-center space-y-2 backdrop-blur-sm">
        <Mail className="w-8 h-8 mx-auto text-primary" />
        <p className="font-semibold text-sm">Thank you!</p>
        <p className="text-xs text-muted-foreground">Your message has been sent.</p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card/50 border border-border/60 space-y-3 backdrop-blur-sm">
      <h3 className="font-semibold text-sm">{content.title || "Get in Touch"}</h3>
      <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} disabled={isEditing} />
      <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isEditing} required />
      <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} disabled={isEditing} />
      <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} disabled={isEditing} />
      <textarea className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm min-h-[60px]" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} disabled={isEditing} />
      <Button className="w-full rounded-xl" disabled={isEditing || submitting || !email} onClick={handleSubmit}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (content.buttonText || "Send")}
      </Button>
    </div>
  );
}
