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
  const usableW = Math.max(0, canvasWidth - s.paddingL - s.paddingR);
  let { x, y, w, h } = layout;

  if (mode === "grid") {
    const colW = (usableW - s.gutter * (s.columns - 1)) / s.columns;
    const cellX = colW + s.gutter;
    const relX = x - s.paddingL;
    const col = Math.max(0, Math.round(relX / cellX));
    x = s.paddingL + col * cellX;
    const cols = Math.max(1, Math.round((w + s.gutter) / cellX));
    w = cols * colW + (cols - 1) * s.gutter;
    y = snapValue(y, s.rowHeight);
    h = Math.max(s.rowHeight, snapValue(h, s.rowHeight));
  } else if (mode === "free") {
    x = snapValue(x, s.snap);
    y = snapValue(y, s.snap);
    w = snapValue(w, s.snap);
    h = snapValue(h, s.snap);
  }

  w = Math.max(MIN_BLOCK_W, w);
  h = Math.max(MIN_BLOCK_H, h);
  x = Math.max(0, x);
  y = Math.max(0, y);
  return { x, y, w, h };
}
