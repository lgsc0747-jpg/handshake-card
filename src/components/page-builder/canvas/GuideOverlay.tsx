import type { BlockLayout, CanvasSettings } from "./types";

export interface SmartGuide {
  axis: "v" | "h";
  /** Position along the perpendicular axis (x for vertical, y for horizontal). */
  pos: number;
  /** Optional second point – when set we clip the guide to span both refs. */
  fromBlock?: { from: number; to: number };
  kind: "center" | "edge" | "block";
  /** Distance from the active edge/center to the target (0 = exact snap). */
  delta?: number;
  /** Snap-point along the guide for debug marker. */
  hit?: { x: number; y: number };
}

/** Default tolerance in canvas px for treating two values as "aligned". */
export const SMART_TOLERANCE = 2;

/** Compute smart symmetry guides for the active layout against other blocks + canvas. */
export function computeSmartGuides(
  active: BlockLayout | null,
  others: BlockLayout[],
  canvasW: number,
  canvasH: number,
  tolerance = SMART_TOLERANCE,
  mode: "edges" | "edges-centers" = "edges-centers",
): SmartGuide[] {
  if (!active) return [];
  const guides: SmartGuide[] = [];
  const cx = active.x + active.w / 2;
  const cy = active.y + active.h / 2;
  const includeCenters = mode === "edges-centers";

  if (includeCenters) {
    if (Math.abs(cx - canvasW / 2) <= tolerance) {
      guides.push({ axis: "v", pos: canvasW / 2, kind: "center", delta: cx - canvasW / 2, hit: { x: canvasW / 2, y: cy } });
    }
    if (Math.abs(cy - canvasH / 2) <= tolerance) {
      guides.push({ axis: "h", pos: canvasH / 2, kind: "center", delta: cy - canvasH / 2, hit: { x: cx, y: canvasH / 2 } });
    }
    // Margin symmetry
    const leftGap = active.x;
    const rightGap = canvasW - (active.x + active.w);
    if (Math.abs(leftGap - rightGap) <= tolerance) {
      guides.push({ axis: "v", pos: canvasW / 2, kind: "center", delta: leftGap - rightGap });
    }
  }

  // Block-to-block alignment (edges + centers)
  for (const o of others) {
    const ocx = o.x + o.w / 2;
    const ocy = o.y + o.h / 2;
    const vTargets: Array<[number, number]> = [
      [active.x, o.x],
      [active.x + active.w, o.x + o.w],
      ...(includeCenters ? [[cx, ocx] as [number, number]] : []),
      [active.x, o.x + o.w],
      [active.x + active.w, o.x],
    ];
    for (const [a, b] of vTargets) {
      if (Math.abs(a - b) <= tolerance) {
        guides.push({
          axis: "v", pos: b, kind: "block", delta: a - b,
          hit: { x: b, y: cy },
          fromBlock: {
            from: Math.min(active.y, o.y),
            to: Math.max(active.y + active.h, o.y + o.h),
          },
        });
      }
    }
    const hTargets: Array<[number, number]> = [
      [active.y, o.y],
      [active.y + active.h, o.y + o.h],
      ...(includeCenters ? [[cy, ocy] as [number, number]] : []),
      [active.y, o.y + o.h],
      [active.y + active.h, o.y],
    ];
    for (const [a, b] of hTargets) {
      if (Math.abs(a - b) <= tolerance) {
        guides.push({
          axis: "h", pos: b, kind: "block", delta: a - b,
          hit: { x: cx, y: b },
          fromBlock: {
            from: Math.min(active.x, o.x),
            to: Math.max(active.x + active.w, o.x + o.w),
          },
        });
      }
    }
  }
  return guides;
}

/** Smart guide overlay with optional snap-debug markers. */
export function GuideOverlay({
  settings,
  width,
  height,
  active,
  others,
}: {
  settings: CanvasSettings;
  width: number;
  height: number;
  active?: BlockLayout | null;
  others?: BlockLayout[];
}) {
  const tol = settings.snapTolerance ?? SMART_TOLERANCE;
  const mode = settings.snapMode ?? "edges-centers";
  const debug = settings.snapDebug ?? false;
  const guides = computeSmartGuides(active ?? null, others ?? [], width, height, tol, mode);
  if (!guides.length) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {guides.map((g, i) => {
        const exact = Math.abs(g.delta ?? 0) < 0.5;
        const baseStroke = g.kind === "center" ? "rgb(244 114 182)" : "rgb(56 189 248)";
        const stroke = debug && exact ? "rgb(34 197 94)" : baseStroke;
        const strokeWidth = debug && exact ? 1.5 : 1;
        if (g.axis === "v") {
          const y1 = g.fromBlock ? g.fromBlock.from : 0;
          const y2 = g.fromBlock ? g.fromBlock.to : height;
          return (
            <g key={i}>
              <line x1={g.pos} x2={g.pos} y1={y1} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="3 3" />
              {debug && g.hit && (
                <circle cx={g.hit.x} cy={g.hit.y} r={3} fill={exact ? "rgb(34 197 94)" : baseStroke} />
              )}
            </g>
          );
        }
        const x1 = g.fromBlock ? g.fromBlock.from : 0;
        const x2 = g.fromBlock ? g.fromBlock.to : width;
        return (
          <g key={i}>
            <line x1={x1} x2={x2} y1={g.pos} y2={g.pos} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="3 3" />
            {debug && g.hit && (
              <circle cx={g.hit.x} cy={g.hit.y} r={3} fill={exact ? "rgb(34 197 94)" : baseStroke} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
