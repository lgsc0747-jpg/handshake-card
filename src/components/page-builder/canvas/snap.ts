import type { BlockLayout, CanvasSettings, LayoutMode } from "./types";
import { DEFAULT_CANVAS_SETTINGS, MIN_BLOCK_W, MIN_BLOCK_H } from "./types";

export function snapValue(v: number, step: number): number {
  if (!step || step <= 1) return Math.round(v);
  return Math.round(v / step) * step;
}

export function snapLayout(
  layout: BlockLayout,
  mode: LayoutMode,
  settings: CanvasSettings,
  canvasWidth: number,
): BlockLayout {
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  let { x, y, w, h } = layout;

  if (mode === "grid" && s.snap) {
    const colW = (canvasWidth - s.gutter * (s.columns - 1)) / s.columns;
    const cellX = colW + s.gutter;
    const col = Math.max(0, Math.round(x / cellX));
    x = col * cellX;
    const cols = Math.max(1, Math.round((w + s.gutter) / cellX));
    w = cols * colW + (cols - 1) * s.gutter;
    y = snapValue(y, s.rowHeight);
    h = Math.max(s.rowHeight, snapValue(h, s.rowHeight));
  } else if (mode === "free" && s.snap) {
    x = snapValue(x, s.snapStep);
    y = snapValue(y, s.snapStep);
    w = snapValue(w, s.snapStep);
    h = snapValue(h, s.snapStep);
  }

  w = Math.max(MIN_BLOCK_W, w);
  h = Math.max(MIN_BLOCK_H, h);
  x = Math.max(0, x);
  y = Math.max(0, y);
  return { x, y, w, h };
}
