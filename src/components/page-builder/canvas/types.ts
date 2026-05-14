export type LayoutMode = "stack" | "grid" | "free";

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasSettings {
  paddingT?: number;
  paddingR?: number;
  paddingB?: number;
  paddingL?: number;
  columns?: number;
  gutter?: number;
  rowHeight?: number;
  showGuides?: boolean;
  snap?: number; // freeform snap step (px), 0 = no snap
}

export const DEFAULT_CANVAS_SETTINGS: Required<CanvasSettings> = {
  paddingT: 32,
  paddingR: 32,
  paddingB: 32,
  paddingL: 32,
  columns: 12,
  gutter: 16,
  rowHeight: 40,
  showGuides: true,
  snap: 8,
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
