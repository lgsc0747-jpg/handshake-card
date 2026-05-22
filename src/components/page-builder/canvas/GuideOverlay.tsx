import type { BlockLayout, CanvasSettings } from "./types";

export interface SmartGuide {
  axis: "v" | "h";
  /** Position along the perpendicular axis (x for vertical, y for horizontal). */
  pos: number;
  /** Optional second point – when set we clip the guide to span both refs. */
  fromBlock?: { from: number; to: number };
  kind: "center" | "edge" | "block";
}

/** Tolerance in canvas px for treating two values as "aligned". */
export const SMART_TOLERANCE = 2;

/** Compute smart symmetry guides for the active layout against other blocks + canvas. */
export function computeSmartGuides(
  active: BlockLayout | null,
  others: BlockLayout[],
  canvasW: number,
  canvasH: number,
): SmartGuide[] {
  if (!active) return [];
  const guides: SmartGuide[] = [];
  const cx = active.x + active.w / 2;
  const cy = active.y + active.h / 2;

  // Canvas-center symmetry
  if (Math.abs(cx - canvasW / 2) <= SMART_TOLERANCE) {
    guides.push({ axis: "v", pos: canvasW / 2, kind: "center" });
  }
  if (Math.abs(cy - canvasH / 2) <= SMART_TOLERANCE) {
    guides.push({ axis: "h", pos: canvasH / 2, kind: "center" });
  }
  // Canvas edge alignment (left/right margin symmetry)
  const leftGap = active.x;
  const rightGap = canvasW - (active.x + active.w);
  if (Math.abs(leftGap - rightGap) <= SMART_TOLERANCE) {
    guides.push({ axis: "v", pos: canvasW / 2, kind: "center" });
  }

  // Block-to-block alignment (edges + centers)
  for (const o of others) {
    const ocx = o.x + o.w / 2;
    const ocy = o.y + o.h / 2;
    // Vertical guides (matching x positions)
    const vTargets: Array<[number, number]> = [
      [active.x, o.x],
      [active.x + active.w, o.x + o.w],
      [cx, ocx],
      [active.x, o.x + o.w],
      [active.x + active.w, o.x],
    ];
    for (const [a, b] of vTargets) {
      if (Math.abs(a - b) <= SMART_TOLERANCE) {
        guides.push({
          axis: "v",
          pos: b,
          kind: "block",
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
      [cy, ocy],
      [active.y, o.y + o.h],
      [active.y + active.h, o.y],
    ];
    for (const [a, b] of hTargets) {
      if (Math.abs(a - b) <= SMART_TOLERANCE) {
        guides.push({
          axis: "h",
          pos: b,
          kind: "block",
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

/**
 * Smart guide overlay. Renders dynamic alignment lines that only appear
 * when the active block hits a symmetry point. Static center guides removed.
 */
export function GuideOverlay({
  settings: _settings,
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
  const guides = computeSmartGuides(active ?? null, others ?? [], width, height);
  if (!guides.length) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {guides.map((g, i) => {
        const stroke = g.kind === "center" ? "rgb(244 114 182)" : "rgb(56 189 248)";
        if (g.axis === "v") {
          const y1 = g.fromBlock ? g.fromBlock.from : 0;
          const y2 = g.fromBlock ? g.fromBlock.to : height;
          return (
            <line
              key={i}
              x1={g.pos} x2={g.pos} y1={y1} y2={y2}
              stroke={stroke} strokeWidth={1} strokeDasharray="3 3"
            />
          );
        }
        const x1 = g.fromBlock ? g.fromBlock.from : 0;
        const x2 = g.fromBlock ? g.fromBlock.to : width;
        return (
          <line
            key={i}
            x1={x1} x2={x2} y1={g.pos} y2={g.pos}
            stroke={stroke} strokeWidth={1} strokeDasharray="3 3"
          />
        );
      })}
    </svg>
  );
}
