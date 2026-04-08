import type { PageBlock } from "./types";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, Linkedin, Github, Twitter, Instagram, Facebook, Youtube, ExternalLink, MapPin, Quote as QuoteIcon, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface BlockRendererProps {
  block: PageBlock;
  isEditing?: boolean;
  onClick?: () => void;
  persona?: any;
}

export function BlockRenderer({ block, isEditing, onClick, persona }: BlockRendererProps) {
  const { block_type, content, styles } = block;
  const wrapperStyle: React.CSSProperties = {
    paddingTop: styles.paddingY ?? 24,
    paddingBottom: styles.paddingY ?? 24,
    paddingLeft: styles.paddingX ?? 16,
    paddingRight: styles.paddingX ?? 16,
    backgroundColor: styles.bgColor ?? "transparent",
    borderRadius: styles.borderRadius ?? 0,
    textAlign: (styles.alignment ?? "left") as any,
    maxWidth: styles.maxWidth ?? "100%",
    margin: "0 auto",
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
        <div className="relative" style={wrapperStyle}>
          {editOverlay}
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={{ height: content.height ?? 48 }}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative flex" style={{ ...wrapperStyle, justifyContent: styles.alignment === "center" ? "center" : styles.alignment === "right" ? "flex-end" : "flex-start" }}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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

    case "products":
      return (
        <div className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="text-center p-8 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-sm text-muted-foreground">📦 Product grid loads from your store</span>
          </div>
        </div>
      );

    case "nfc_card":
      return (
        <div className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="text-center p-8 rounded-xl bg-muted/20 border border-border/40">
            <span className="text-sm text-muted-foreground">💳 3D NFC Card renders from your card settings</span>
          </div>
        </div>
      );

    case "contact":
      return (
        <div className="relative" style={wrapperStyle}>
          {editOverlay}
          <div className="p-5 rounded-2xl bg-card/50 border border-border/60 space-y-3 backdrop-blur-sm">
            <h3 className="font-semibold text-sm">{content.title || "Get in Touch"}</h3>
            <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Your name" disabled={isEditing} />
            <input className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm" placeholder="Email" disabled={isEditing} />
            <textarea className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-sm min-h-[60px]" placeholder="Message" disabled={isEditing} />
            <Button className="w-full rounded-xl" disabled={isEditing}>{content.buttonText || "Send"}</Button>
          </div>
        </div>
      );

    case "social": {
      const links = content.links ?? [];
      return (
        <div className="relative" style={wrapperStyle}>
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
        <div className="relative" style={wrapperStyle}>
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
