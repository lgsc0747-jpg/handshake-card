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

/** Snap layout to symmetry/edge alignment with other blocks + canvas center. */
export function snapToSmartGuides(
  layout: BlockLayout,
  others: BlockLayout[],
  canvasW: number,
  canvasH: number,
  tolerance = 6,
): BlockLayout {
  const out = { ...layout };
  const cx = layout.x + layout.w / 2;
  const cy = layout.y + layout.h / 2;
  let snappedX = false;
  let snappedY = false;
  if (Math.abs(cx - canvasW / 2) <= tolerance) { out.x = canvasW / 2 - layout.w / 2; snappedX = true; }
  if (Math.abs(cy - canvasH / 2) <= tolerance) { out.y = canvasH / 2 - layout.h / 2; snappedY = true; }
  for (const o of others) {
    if (!snappedX) {
      const candX: Array<[number, number, number]> = [
        [layout.x, o.x, o.x],
        [layout.x + layout.w, o.x + o.w, (o.x + o.w) - layout.w],
        [cx, o.x + o.w / 2, o.x + o.w / 2 - layout.w / 2],
        [layout.x, o.x + o.w, o.x + o.w],
        [layout.x + layout.w, o.x, o.x - layout.w],
      ];
      for (const [a, b, apply] of candX) {
        if (Math.abs(a - b) <= tolerance) { out.x = apply; snappedX = true; break; }
      }
    }
    if (!snappedY) {
      const candY: Array<[number, number, number]> = [
        [layout.y, o.y, o.y],
        [layout.y + layout.h, o.y + o.h, (o.y + o.h) - layout.h],
        [cy, o.y + o.h / 2, o.y + o.h / 2 - layout.h / 2],
        [layout.y, o.y + o.h, o.y + o.h],
        [layout.y + layout.h, o.y, o.y - layout.h],
      ];
      for (const [a, b, apply] of candY) {
        if (Math.abs(a - b) <= tolerance) { out.y = apply; snappedY = true; break; }
      }
    }
    if (snappedX && snappedY) break;
  }
  return out;
}
