import { forwardRef, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
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

interface SocialIconProps {
  href: string;
  label: string;
  external?: boolean;
  children: React.ReactNode;
}

export function InteractiveCard3D({
  name,
  headline,
  avatarUrl,
  username,
  accentColor = "#0d9488",
  linkedinUrl,
  githubUrl,
  website,
  email,
}: InteractiveCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Dampen tilt when flipped so back-side is easier to interact with
  const tiltStrength = isFlipped ? 5 : 15;
  const rotateX = useSpring(useTransform(y, [-150, 150], [tiltStrength, -tiltStrength]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-tiltStrength, tiltStrength]), { stiffness: 300, damping: 30 });

  const glareX = useTransform(x, [-150, 150], [0, 100]);
  const glareY = useTransform(y, [-150, 150], [0, 100]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    x.set(clientX - rect.left - rect.width / 2);
    y.set(clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const profileUrl = `${window.location.origin}/p/${username}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: name, url: profileUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Link copied!", description: "Profile URL copied to clipboard." });
    }
  };

  const handleFlip = () => setIsFlipped((f) => !f);
  const handleFrontClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Card container — fluid width, credit-card aspect ratio, deep perspective */}
      <div
        ref={cardRef}
        className="w-full max-w-[420px] text-[clamp(14px,3.5vw,18px)]"
        style={{ perspective: "1500px", aspectRatio: "1.58 / 1" }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
      >
        <motion.div
          className="relative w-full h-full"
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          {/* ──── FRONT FACE ──── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 cursor-pointer"
            style={{
              backfaceVisibility: "hidden",
              pointerEvents: isFlipped ? "none" : "auto",
              background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`,
              boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
            }}
            onClick={handleFrontClick}
          >
            {/* Glass overlay */}
            <div className="absolute inset-0 backdrop-blur-xl bg-white/5" />
            {/* Glare */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: useTransform(
                  [glareX, glareY],
                  ([gx, gy]) =>
                    `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.3) 0%, transparent 55%)`
                ),
              }}
            />

            {/* Content — all sizes relative via em/% */}
            <div className="relative z-10 h-full flex flex-col justify-between p-[7%]">
              {/* Top row */}
              <div className="flex items-center justify-between">
                <motion.div
                  className="flex items-center gap-[0.4em]"
                  style={{ translateZ: 10 }}
                >
                  <div
                    className="w-[2em] h-[2em] rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    <Wifi className="w-[1em] h-[1em] text-white" />
                  </div>
                  <span className="text-[0.55em] font-semibold tracking-[0.2em] uppercase text-white/70">
                    NFC Hub
                  </span>
                </motion.div>
                <div className="flex items-center gap-[0.35em]">
                  <span className="relative flex h-[0.5em] w-[0.5em]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-400" />
                    <span className="relative inline-flex rounded-full h-full w-full bg-green-500" />
                  </span>
                  <span className="text-[0.55em] font-medium text-white/80">Active</span>
                </div>
              </div>

              {/* Bottom row — avatar + name with parallax depth */}
              <div className="flex items-end gap-[0.75em]">
                <motion.div style={{ translateZ: 20 }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-[3em] h-[3em] rounded-full border-2 border-white/30 object-cover"
                    />
                  ) : (
                    <div
                      className="w-[3em] h-[3em] rounded-full border-2 border-white/30 flex items-center justify-center text-white font-bold text-[1.2em]"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    >
                      {(name || "?")[0]}
                    </div>
                  )}
                </motion.div>
                <motion.div className="min-w-0 flex-1" style={{ translateZ: 10 }}>
                  <h2 className="text-white font-bold text-[1.1em] truncate leading-tight">
                    {name || "Your Name"}
                  </h2>
                  {headline && (
                    <p className="text-white/70 text-[0.65em] truncate">{headline}</p>
                  )}
                </motion.div>
              </div>
            </div>
          </div>

          {/* ──── BACK FACE ──── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20"
            style={{
              backfaceVisibility: "hidden",
              pointerEvents: isFlipped ? "auto" : "none",
              transform: "rotateY(180deg)",
              background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}66)`,
              boxShadow: `0 25px 50px -12px ${accentColor}44, 0 0 40px ${accentColor}22`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 backdrop-blur-xl bg-white/5" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center gap-[0.8em] p-[7%]">
              {/* Flip-back button in top-right corner */}
              <button
                className="absolute top-[5%] right-[5%] w-[1.8em] h-[1.8em] rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                aria-label="Flip back"
              >
                <RotateCcw className="w-[0.8em] h-[0.8em] text-white" />
              </button>

              {/* QR Code — scales to ~60% of card height */}
              <div className="bg-white rounded-xl p-[0.6em]" style={{ width: "min(55%, 140px)" }}>
                <QRCodeSVG
                  value={profileUrl}
                  size={200}
                  fgColor={accentColor}
                  bgColor="#ffffff"
                  level="M"
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              <p className="text-white/60 text-[0.5em] font-mono">
                /p/{username}
              </p>

              {/* Social icons — fully clickable without triggering flip */}
              <div className="flex items-center gap-[0.6em] mt-[0.3em]">
                {linkedinUrl && (
                  <SocialIcon href={linkedinUrl} label="LinkedIn">
                    <Linkedin className="w-[0.85em] h-[0.85em] text-white" />
                  </SocialIcon>
                )}
                {githubUrl && (
                  <SocialIcon href={githubUrl} label="GitHub">
                    <Github className="w-[0.85em] h-[0.85em] text-white" />
                  </SocialIcon>
                )}
                {website && (
                  <SocialIcon href={website} label="Website">
                    <Globe className="w-[0.85em] h-[0.85em] text-white" />
                  </SocialIcon>
                )}
                {email && (
                  <SocialIcon href={`mailto:${email}`} label="Email" external={false}>
                    <Mail className="w-[0.85em] h-[0.85em] text-white" />
                  </SocialIcon>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action buttons below card */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleFlip();
          }}
          className="text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Flip
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="text-xs"
        >
          <Share2 className="w-3 h-3 mr-1" /> Share
        </Button>
      </div>
    </div>
  );
}

/** Small helper so social links don't bubble click to flip handler */
const SocialIcon = forwardRef<HTMLAnchorElement, SocialIconProps>(function SocialIcon({
  href,
  label,
  external = true,
  children,
}, ref) {
  return (
    <a
      ref={ref}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="w-[2em] h-[2em] rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
});

SocialIcon.displayName = "SocialIcon";
