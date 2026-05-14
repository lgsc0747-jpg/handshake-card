import type { CanvasSettings, LayoutMode } from "./types";
import { DEFAULT_CANVAS_SETTINGS } from "./types";

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
  if (!s.showGuides || mode === "stack") return null;

  const usableW = Math.max(0, width - s.paddingL - s.paddingR);
  const colW = (usableW - s.gutter * (s.columns - 1)) / s.columns;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {/* Margin guides */}
      <rect
        x={s.paddingL}
        y={s.paddingT}
        width={Math.max(0, width - s.paddingL - s.paddingR)}
        height={Math.max(0, height - s.paddingT - s.paddingB)}
        fill="none"
        stroke="hsl(var(--primary) / 0.3)"
        strokeDasharray="6 6"
        strokeWidth={1}
      />
      {/* Column guides (grid mode) */}
      {mode === "grid" &&
        Array.from({ length: s.columns + 1 }).map((_, i) => {
          const x = s.paddingL + i * (colW + s.gutter) - (i === s.columns ? s.gutter : 0);
          return (
            <line
              key={`c${i}`}
              x1={x}
              y1={s.paddingT}
              x2={x}
              y2={height - s.paddingB}
              stroke="hsl(var(--primary) / 0.12)"
              strokeWidth={1}
            />
          );
        })}
    </svg>
  );
}
