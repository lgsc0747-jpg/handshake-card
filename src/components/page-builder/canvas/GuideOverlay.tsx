import type { CanvasSettings } from "./types";
import { DEFAULT_CANVAS_SETTINGS } from "./types";

/**
 * Center crosshair guides only. Columns/margins removed.
 */
export function GuideOverlay({
  settings,
  width,
  height,
}: {
  settings: CanvasSettings;
  width: number;
  height: number;
}) {
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  if (!s.showGuides) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      <line
        x1={width / 2} y1={0} x2={width / 2} y2={height}
        stroke="rgb(59 130 246 / 0.25)"
        strokeDasharray="4 6"
        strokeWidth={1}
      />
      <line
        x1={0} y1={height / 2} x2={width} y2={height / 2}
        stroke="rgb(59 130 246 / 0.25)"
        strokeDasharray="4 6"
        strokeWidth={1}
      />
    </svg>
  );
}
