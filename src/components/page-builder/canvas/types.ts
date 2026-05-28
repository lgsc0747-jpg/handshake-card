export type LayoutMode = "free";
export type DeviceMode = "desktop" | "tablet" | "mobile";

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotation in degrees, around the block's center. */
  rotate?: number;
}

export type BackgroundFill =
  | { kind: "solid"; color: string; opacity?: number }
  | {
      kind: "gradient";
      from: string;
      to: string;
      angle?: number;
      opacity?: number;
    }
  | {
      kind: "image";
      url: string;
      fit?: "cover" | "contain" | "fill" | "tile";
      position?: string;
      opacity?: number;
      blur?: number;
    };

export interface CanvasSection {
  id: string;
  height: number;
  bg?: BackgroundFill | null;
  label?: string;
}

export interface CanvasSettings {
  snap?: boolean;
  snapStep?: number;
  showGuides?: boolean;
  /** Snap blocks to smart symmetry guides while dragging. */
  smartSnap?: boolean;
  /** Tolerance (canvas px) used by smart snap + guide detection. */
  snapTolerance?: number;
  /** Snap targets: edges only, or edges + centers. */
  snapMode?: "edges" | "edges-centers";
  /** Render snap-debug markers (highlighted guide + intersection dots). */
  snapDebug?: boolean;
  /** Render only an endpoint outline while dragging (no smooth motion). */
  dragPreview?: "live" | "endpoint";
  background?: BackgroundFill | null;
  accent?: string | null;
  sections?: CanvasSection[];
  overflowPadding?: number;
}

export const DEFAULT_CANVAS_SETTINGS: Required<
  Pick<CanvasSettings, "snap" | "snapStep" | "showGuides" | "overflowPadding" | "smartSnap" | "dragPreview" | "snapTolerance" | "snapMode" | "snapDebug">
> & { background: BackgroundFill | null; accent: string | null; sections: CanvasSection[] } = {
  snap: true,
  snapStep: 8,
  showGuides: true,
  smartSnap: true,
  snapTolerance: 6,
  snapMode: "edges-centers",
  snapDebug: false,
  dragPreview: "live",
  overflowPadding: 360,
  background: { kind: "solid", color: "#0a0a0a", opacity: 1 },
  accent: "#3b82f6",
  sections: [{ id: "default", height: 1080 }],
};

/** Per-device canvas widths. Height is dynamic via sections. */
export const DEVICE_SIZES: Record<DeviceMode, { w: number }> = {
  desktop: { w: 1440 },
  tablet: { w: 768 },
  mobile: { w: 375 },
};

export const MIN_SECTION_H = 200;
export const DEFAULT_SECTION_H = 600;

export const DEFAULT_BLOCK_W = 320;
export const DEFAULT_BLOCK_H = 160;
export const MIN_BLOCK_W = 60;
export const MIN_BLOCK_H = 24;

export function readLayout(styles: Record<string, any> | null | undefined): BlockLayout | null {
  const l = styles?.layout;
  if (!l || typeof l.x !== "number" || typeof l.y !== "number") return null;
  return {
    x: l.x,
    y: l.y,
    w: typeof l.w === "number" ? l.w : DEFAULT_BLOCK_W,
    h: typeof l.h === "number" ? l.h : DEFAULT_BLOCK_H,
    rotate: typeof l.rotate === "number" ? l.rotate : 0,
  };
}

export function withLayout(styles: Record<string, any> | null | undefined, layout: BlockLayout): Record<string, any> {
  return { ...(styles || {}), layout };
}

export const TEXT_BLOCK_TYPES = new Set([
  "heading", "text", "quote", "button",
  "testimonial", "team", "faq", "stats", "icon_grid", "contact",
]);

/** Compose a CSS background string from a BackgroundFill. */
export function backgroundToCss(bg: BackgroundFill | null | undefined): React.CSSProperties {
  if (!bg) return {};
  const opacity = bg.opacity ?? 1;
  if (bg.kind === "solid") {
    return { backgroundColor: bg.color, opacity };
  }
  if (bg.kind === "gradient") {
    return {
      backgroundImage: `linear-gradient(${bg.angle ?? 135}deg, ${bg.from}, ${bg.to})`,
      opacity,
    };
  }
  // image
  const fit = bg.fit ?? "cover";
  const size = fit === "tile" ? "auto" : fit;
  const repeat = fit === "tile" ? "repeat" : "no-repeat";
  return {
    backgroundImage: `url("${bg.url}")`,
    backgroundSize: size as any,
    backgroundRepeat: repeat,
    backgroundPosition: bg.position ?? "center",
    opacity,
    filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
  };
}
