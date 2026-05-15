import type { CanvasSettings, LayoutMode } from "./types";
import { DEFAULT_CANVAS_SETTINGS } from "./types";

/**
 * Center crosshair guides + optional column lines.
 * Margins removed — the canvas itself is the only boundary.
 */
export function GuideOverlay({
  mode,
  settings,
  width,
  height,
}: {
  mode: LayoutMode;
  settings: CanvasSettings;
  width: number;
  height: number;
}) {
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  if (mode === "stack") return null;

  const colW = (width - s.gutter * (s.columns - 1)) / s.columns;
  const showCols = s.showColumns && mode === "grid";

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {/* Center guides */}
      {s.showGuides && (
        <>
          <line
            x1={width / 2} y1={0} x2={width / 2} y2={height}
            stroke="hsl(var(--primary) / 0.35)"
            strokeDasharray="4 6"
            strokeWidth={1}
          />
          <line
            x1={0} y1={height / 2} x2={width} y2={height / 2}
            stroke="hsl(var(--primary) / 0.35)"
            strokeDasharray="4 6"
            strokeWidth={1}
          />
        </>
      )}
      {/* Column guides */}
      {showCols &&
        Array.from({ length: s.columns + 1 }).map((_, i) => {
          const x = i * (colW + s.gutter) - (i === s.columns ? s.gutter : 0);
          return (
            <line
              key={`c${i}`}
              x1={x} y1={0} x2={x} y2={height}
              stroke="hsl(var(--primary) / 0.12)"
              strokeWidth={1}
            />
          );
        })}
    </svg>
  );
}
