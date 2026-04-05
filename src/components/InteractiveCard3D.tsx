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

interface InteractiveCard3DProps {
  name: string;
  headline?: string;
  avatarUrl?: string;
  username: string;
  accentColor?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
  email?: string;
}

interface CardFrontProps {
  accentColor: string;
  avatarUrl?: string;
  glareBackground: MotionValue<string>;
  headline?: string;
  isFlipped: boolean;
  name: string;
  onFlip: () => void;
}

interface CardBackProps {
  accentColor: string;
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
    linkedinUrl,
    githubUrl,
    website,
    email,
  },
  forwardedRef,
) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      cardRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const activeTiltRange = isFlipped ? 0 : TILT_RANGE;
  const rotateX = useSpring(
    useTransform(y, [-180, 180], [activeTiltRange, -activeTiltRange]),
    CARD_SPRING,
  );
  const rotateY = useSpring(
    useTransform(x, [-180, 180], [-activeTiltRange, activeTiltRange]),
    CARD_SPRING,
  );

  const glareX = useTransform(x, [-180, 180], [18, 82]);
  const glareY = useTransform(y, [-180, 180], [18, 82]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.28) 0%, transparent 55%)`;

  const profileUrl = `${window.location.origin}/p/${username}`;

  const resetTilt = () => {
    x.set(0);
    y.set(0);
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isFlipped || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

    x.set(clientX - rect.left - rect.width / 2);
    y.set(clientY - rect.top - rect.height / 2);
  };

  const handleFlipToBack = () => {
    resetTilt();
    setIsFlipped(true);
  };

  const handleFlipToFront = () => {
    resetTilt();
    setIsFlipped(false);
  };

  const handleToggleFlip = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    resetTilt();
    setIsFlipped((value) => !value);
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
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
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
              avatarUrl={avatarUrl}
              glareBackground={glareBackground}
              headline={headline}
              isFlipped={isFlipped}
              name={name}
              onFlip={handleFlipToBack}
            />
            <CardBack
              accentColor={accentColor}
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleToggleFlip}
          className="text-xs"
        >
          <RotateCcw className="mr-1 h-3 w-3" /> {isFlipped ? "Front" : "Flip"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          className="text-xs"
        >
          <Share2 className="mr-1 h-3 w-3" /> Share
        </Button>
      </div>
    </div>
  );
});

function CardFront({
  accentColor,
  avatarUrl,
  glareBackground,
  headline,
  isFlipped,
  name,
  onFlip,
}: CardFrontProps) {
  return (
    <div
      className="absolute inset-0 cursor-pointer overflow-hidden rounded-2xl border border-white/20"
      style={{
        ...FACE_STYLE,
        pointerEvents: isFlipped ? "none" : "auto",
        background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`,
        boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
      }}
      onClick={onFlip}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: glareBackground }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-[7%]">
        <div className="flex items-center justify-between" style={{ transform: "translateZ(16px)" }}>
          <div className="flex items-center gap-[0.4em]">
            <div
              className="flex h-[2em] w-[2em] items-center justify-center rounded-lg"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Wifi className="h-[1em] w-[1em] text-white" />
            </div>
            <span className="text-[0.55em] font-semibold uppercase tracking-[0.2em] text-white/70">
              NFC Hub
            </span>
          </div>
          <div className="flex items-center gap-[0.35em]">
            <span className="relative flex h-[0.5em] w-[0.5em]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
            </span>
            <span className="text-[0.55em] font-medium text-white/80">Active</span>
          </div>
        </div>

        <div className="flex items-end gap-[0.75em]" style={{ transform: "translateZ(24px)" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-[3em] w-[3em] rounded-full border-2 border-white/30 object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-[3em] w-[3em] items-center justify-center rounded-full border-2 border-white/30 text-[1.2em] font-bold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {(name || "?")[0]}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.1em] font-bold leading-tight text-white">
              {name || "Your Name"}
            </h2>
            {headline && <p className="truncate text-[0.65em] text-white/70">{headline}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({
  accentColor,
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
        background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}66)`,
        boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[0.8em] p-[7%]">
        <button
          className="absolute right-[5%] top-[5%] flex h-[1.8em] w-[1.8em] items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          onClick={(event) => {
            event.stopPropagation();
            onFlipBack();
          }}
          aria-label="Flip back"
          type="button"
        >
          <RotateCcw className="h-[0.8em] w-[0.8em] text-white" />
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
        <p className="text-[0.5em] font-mono text-white/60">/p/{username}</p>

        <div className="mt-[0.3em] flex items-center gap-[0.6em]">
          {linkedinUrl && (
            <SocialIcon href={linkedinUrl} label="LinkedIn">
              <Linkedin className="h-[0.85em] w-[0.85em] text-white" />
            </SocialIcon>
          )}
          {githubUrl && (
            <SocialIcon href={githubUrl} label="GitHub">
              <Github className="h-[0.85em] w-[0.85em] text-white" />
            </SocialIcon>
          )}
          {website && (
            <SocialIcon href={website} label="Website">
              <Globe className="h-[0.85em] w-[0.85em] text-white" />
            </SocialIcon>
          )}
          {email && (
            <SocialIcon href={`mailto:${email}`} label="Email" external={false}>
              <Mail className="h-[0.85em] w-[0.85em] text-white" />
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
