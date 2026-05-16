import type { BlockLayout, CanvasSettings } from "./types";
import { DEFAULT_CANVAS_SETTINGS, MIN_BLOCK_W, MIN_BLOCK_H } from "./types";

export function snapValue(v: number, step: number): number {
  if (!step || step <= 1) return Math.round(v);
  return Math.round(v / step) * step;
}

export function snapLayout(
  layout: BlockLayout,
  settings: CanvasSettings,
  canvasWidth: number,
): BlockLayout {
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  let { x, y, w, h } = layout;

  if (s.snap) {
    x = snapValue(x, s.snapStep);
    y = snapValue(y, s.snapStep);
    w = snapValue(w, s.snapStep);
    h = snapValue(h, s.snapStep);
  }

  w = Math.max(MIN_BLOCK_W, w);
  h = Math.max(MIN_BLOCK_H, h);
  x = Math.max(-w / 2, Math.min(canvasWidth - w / 2, x));
  y = Math.max(0, y);
  return { ...layout, x, y, w, h };
}
