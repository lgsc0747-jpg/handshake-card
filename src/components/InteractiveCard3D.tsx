import { forwardRef, useCallback, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Wifi, RotateCcw, Share2, Linkedin, Github, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getTextureCss } from "@/components/DesignStudio/CardTexturePresets";

interface InteractiveCard3DProps {
  name: string;
  headline?: string;
  avatarUrl?: string;
  username: string;
  accentColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  textColor?: string;
  cardBgImageUrl?: string;
  glassOpacity?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
  email?: string;
  fontFamily?: string;
  textAlignment?: string;
  cardBlur?: number;
  cardTexture?: string;
  onFlipToBack?: () => void;
  onLinkClick?: (linkType: string) => void;
}

interface CardFrontProps {
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  cardBgImageUrl?: string;
  glassOpacity: number;
  avatarUrl?: string;
  glareBackground: MotionValue<string>;
  headline?: string;
  isFlipped: boolean;
  name: string;
  onFlip: () => void;
  fontFamily: string;
  textAlignment: string;
  cardBlur: number;
  cardTexture: string;
}

interface CardBackProps {
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  glassOpacity: number;
  email?: string;
  githubUrl?: string;
  isFlipped: boolean;
  linkedinUrl?: string;
  onFlipBack: () => void;
  profileUrl: string;
  username: string;
  website?: string;
}

interface SocialIconProps {
  href: string;
  label: string;
  external?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const TILT_RANGE = 12;
const CARD_SPRING = { stiffness: 260, damping: 28, mass: 0.9 };
const FACE_STYLE = {
  backfaceVisibility: "hidden" as const,
  WebkitBackfaceVisibility: "hidden" as const,
  transformStyle: "preserve-3d" as const,
};

export const InteractiveCard3D = forwardRef<HTMLDivElement, InteractiveCard3DProps>(function InteractiveCard3D(
  {
    name,
    headline,
    avatarUrl,
    username,
    accentColor = "#0d9488",
    secondaryColor,
    tertiaryColor,
    textColor = "#ffffff",
    cardBgImageUrl,
    glassOpacity = 0.15,
    linkedinUrl,
    githubUrl,
    website,
    email,
    fontFamily = "Space Grotesk",
    textAlignment = "left",
    cardBlur = 12,
    cardTexture = "none",
    onFlipToBack,
    onLinkClick,
  },
  forwardedRef,
) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const resolvedSecondary = secondaryColor || accentColor;
  const resolvedTertiary = tertiaryColor || accentColor;

  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      cardRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const activeTiltRange = isFlipped ? 0 : TILT_RANGE;
  const rotateX = useSpring(useTransform(y, [-180, 180], [activeTiltRange, -activeTiltRange]), CARD_SPRING);
  const rotateY = useSpring(useTransform(x, [-180, 180], [-activeTiltRange, activeTiltRange]), CARD_SPRING);

  const glareX = useTransform(x, [-180, 180], [18, 82]);
  const glareY = useTransform(y, [-180, 180], [18, 82]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.28) 0%, transparent 55%)`;

  const profileUrl = `${window.location.origin}/p/${username}`;

  const resetTilt = () => { x.set(0); y.set(0); };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isFlipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
    x.set(clientX - rect.left - rect.width / 2);
    y.set(clientY - rect.top - rect.height / 2);
  };

  const handleFlipToBack = () => { resetTilt(); setIsFlipped(true); onFlipToBack?.(); };
  const handleFlipToFront = () => { resetTilt(); setIsFlipped(false); };
  const handleToggleFlip = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    resetTilt();
    setIsFlipped((v) => !v);
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (navigator.share) {
      await navigator.share({ title: name, url: profileUrl }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Link copied!", description: "Profile URL copied to clipboard." });
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={setCardRef}
        className="w-full max-w-[420px] select-none text-[clamp(14px,3.5vw,18px)]"
        style={{ perspective: "1500px", aspectRatio: "1.58 / 1" }}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseLeave={resetTilt}
        onTouchEnd={resetTilt}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          whileHover={isFlipped ? undefined : { scale: 1.01 }}
          transition={CARD_SPRING}
        >
          <motion.div
            className="relative h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={CARD_SPRING}
          >
            <CardFront
              accentColor={accentColor}
              secondaryColor={resolvedSecondary}
              textColor={textColor}
              cardBgImageUrl={cardBgImageUrl}
              glassOpacity={glassOpacity}
              avatarUrl={avatarUrl}
              glareBackground={glareBackground}
              headline={headline}
              isFlipped={isFlipped}
              name={name}
              onFlip={handleFlipToBack}
              fontFamily={fontFamily}
              textAlignment={textAlignment}
              cardBlur={cardBlur}
              cardTexture={cardTexture}
            />
            <CardBack
              accentColor={accentColor}
              secondaryColor={resolvedSecondary}
              textColor={textColor}
              glassOpacity={glassOpacity}
              email={email}
              githubUrl={githubUrl}
              isFlipped={isFlipped}
              linkedinUrl={linkedinUrl}
              onFlipBack={handleFlipToFront}
              profileUrl={profileUrl}
              username={username}
              website={website}
            />
          </motion.div>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleToggleFlip} className="text-xs">
          <RotateCcw className="mr-1 h-3 w-3" /> {isFlipped ? "Front" : "Flip"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleShare} className="text-xs">
          <Share2 className="mr-1 h-3 w-3" /> Share
        </Button>
      </div>
    </div>
  );
});

function CardFront({
  accentColor,
  secondaryColor,
  textColor,
  cardBgImageUrl,
  glassOpacity,
  avatarUrl,
  glareBackground,
  headline,
  isFlipped,
  name,
  onFlip,
  fontFamily,
  textAlignment,
  cardBlur,
  cardTexture,
}: CardFrontProps) {
  const textureCss = getTextureCss(cardTexture);

  const alignClass =
    textAlignment === "center" ? "text-center items-center" :
    textAlignment === "right" ? "text-right items-end" :
    "text-left items-start";

  const bottomAlign =
    textAlignment === "center" ? "items-center justify-center" :
    textAlignment === "right" ? "items-end justify-end" :
    "items-end";

  return (
    <div
      className="absolute inset-0 cursor-pointer overflow-hidden rounded-2xl border border-white/20"
      style={{
        ...FACE_STYLE,
        pointerEvents: isFlipped ? "none" : "auto",
        background: cardBgImageUrl ? `url(${cardBgImageUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${accentColor}dd, ${secondaryColor}88)`,
        boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
        fontFamily,
      }}
      onClick={onFlip}
    >
      {/* Glass overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(0,0,0,${glassOpacity})`,
          backdropFilter: `blur(${cardBlur}px)`,
        }}
      />
      {/* Texture overlay */}
      {textureCss && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: textureCss.backgroundImage,
            backgroundSize: textureCss.backgroundSize,
          }}
        />
      )}
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: glareBackground }} />

      <div className={`relative z-10 flex h-full flex-col justify-between p-[7%] ${alignClass}`}>
        <div className="flex w-full items-center justify-between" style={{ transform: "translateZ(16px)" }}>
          <div className="flex items-center gap-[0.4em]">
            <div
              className="flex h-[2em] w-[2em] items-center justify-center rounded-lg"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Wifi className="h-[1em] w-[1em]" style={{ color: textColor }} />
            </div>
            <span className="text-[0.55em] font-semibold uppercase tracking-[0.2em]" style={{ color: `${textColor}b3` }}>
              NFC Hub
            </span>
          </div>
          <div className="flex items-center gap-[0.35em]">
            <span className="relative flex h-[0.5em] w-[0.5em]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
            </span>
            <span className="text-[0.55em] font-medium" style={{ color: `${textColor}cc` }}>Active</span>
          </div>
        </div>

        <div className={`flex w-full gap-[0.75em] ${bottomAlign}`} style={{ transform: "translateZ(24px)" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-[3em] w-[3em] rounded-full border-2 border-white/30 object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-[3em] w-[3em] items-center justify-center rounded-full border-2 border-white/30 text-[1.2em] font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: textColor }}
            >
              {(name || "?")[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.1em] font-bold leading-tight" style={{ color: textColor }}>
              {name || "Your Name"}
            </h2>
            {headline && <p className="truncate text-[0.65em]" style={{ color: `${textColor}b3` }}>{headline}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
function CardBack({
  accentColor,
  secondaryColor,
  textColor,
  glassOpacity,
  email,
  githubUrl,
  isFlipped,
  linkedinUrl,
  onFlipBack,
  profileUrl,
  username,
  website,
}: CardBackProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl border border-white/20"
      style={{
        ...FACE_STYLE,
        pointerEvents: isFlipped ? "auto" : "none",
        transform: "rotateY(180deg)",
        background: `linear-gradient(135deg, ${secondaryColor}cc, ${accentColor}66)`,
        boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(0,0,0,${glassOpacity})`,
          backdropFilter: "blur(12px)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[0.8em] p-[7%]">
        <button
          className="absolute right-[5%] top-[5%] flex h-[1.8em] w-[1.8em] items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          onClick={(event) => { event.stopPropagation(); onFlipBack(); }}
          aria-label="Flip back"
          type="button"
        >
          <RotateCcw className="h-[0.8em] w-[0.8em]" style={{ color: textColor }} />
        </button>

        <div className="rounded-xl bg-white p-[0.6em]" style={{ width: "min(55%, 140px)" }}>
          <QRCodeSVG
            value={profileUrl}
            size={200}
            fgColor={accentColor}
            bgColor="#ffffff"
            level="M"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
        <p className="text-[0.5em] font-mono" style={{ color: `${textColor}99` }}>/p/{username}</p>

        <div className="mt-[0.3em] flex items-center gap-[0.6em]">
          {linkedinUrl && (
            <SocialIcon href={linkedinUrl} label="LinkedIn" onClick={() => onLinkClick?.("linkedin")}>
              <Linkedin className="h-[0.85em] w-[0.85em]" style={{ color: textColor }} />
            </SocialIcon>
          )}
          {githubUrl && (
            <SocialIcon href={githubUrl} label="GitHub" onClick={() => onLinkClick?.("github")}>
              <Github className="h-[0.85em] w-[0.85em]" style={{ color: textColor }} />
            </SocialIcon>
          )}
          {website && (
            <SocialIcon href={website} label="Website" onClick={() => onLinkClick?.("website")}>
              <Globe className="h-[0.85em] w-[0.85em]" style={{ color: textColor }} />
            </SocialIcon>
          )}
          {email && (
            <SocialIcon href={`mailto:${email}`} label="Email" external={false} onClick={() => onLinkClick?.("email")}>
              <Mail className="h-[0.85em] w-[0.85em]" style={{ color: textColor }} />
            </SocialIcon>
          )}
        </div>
      </div>
    </div>
  );
}

const SocialIcon = forwardRef<HTMLAnchorElement, SocialIconProps>(function SocialIcon(
  { href, label, external = true, children },
  ref,
) {
  return (
    <a
      ref={ref}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="flex h-[2em] w-[2em] items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
});

SocialIcon.displayName = "SocialIcon";
InteractiveCard3D.displayName = "InteractiveCard3D";
