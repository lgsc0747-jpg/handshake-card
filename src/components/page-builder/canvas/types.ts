export type LayoutMode = "stack" | "grid" | "free";
export type DeviceMode = "desktop" | "tablet" | "mobile";

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasSettings {
  /** Snap-to-grid toggle (free + grid modes). */
  snap?: boolean;
  /** Column count for grid + column guides. */
  columns?: number;
  /** Show vertical column guides on the canvas. */
  showColumns?: boolean;
  /** Show center crosshair guides. */
  showGuides?: boolean;
  /** Pixel gutter between grid columns. */
  gutter?: number;
  /** Row height for grid mode snapping. */
  rowHeight?: number;
  /** Snap step in px when snap = true and mode = free. */
  snapStep?: number;
}

export const DEFAULT_CANVAS_SETTINGS: Required<CanvasSettings> = {
  snap: true,
  columns: 12,
  showColumns: false,
  showGuides: true,
  gutter: 16,
  rowHeight: 40,
  snapStep: 8,
};

/** Per-device canvas dimensions (true viewport sizing). */
export const DEVICE_SIZES: Record<DeviceMode, { w: number; h: number }> = {
  desktop: { w: 1920, h: 1080 },
  tablet: { w: 820, h: 1180 },
  mobile: { w: 390, h: 844 },
};

export const DEFAULT_BLOCK_W = 320;
export const DEFAULT_BLOCK_H = 160;
export const MIN_BLOCK_W = 80;
export const MIN_BLOCK_H = 32;

export function readLayout(styles: Record<string, any> | null | undefined): BlockLayout | null {
  const l = styles?.layout;
  if (!l || typeof l.x !== "number" || typeof l.y !== "number") return null;
  return {
    x: l.x,
    y: l.y,
    w: typeof l.w === "number" ? l.w : DEFAULT_BLOCK_W,
    h: typeof l.h === "number" ? l.h : DEFAULT_BLOCK_H,
  };
}

export function withLayout(styles: Record<string, any> | null | undefined, layout: BlockLayout): Record<string, any> {
  return { ...(styles || {}), layout };
}

export const TEXT_BLOCK_TYPES = new Set(["heading", "text", "quote", "button"]);
