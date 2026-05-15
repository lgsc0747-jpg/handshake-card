import type { BlockLayout } from "./types";

export type AlignOp =
  | "left" | "center-h" | "right"
  | "top" | "middle-v" | "bottom";

export type DistributeOp = "horizontal" | "vertical";

interface IdLayout { id: string; layout: BlockLayout; }

function bounds(items: IdLayout[]) {
  const xs = items.map((i) => i.layout.x);
  const ys = items.map((i) => i.layout.y);
  const xe = items.map((i) => i.layout.x + i.layout.w);
  const ye = items.map((i) => i.layout.y + i.layout.h);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xe),
    maxY: Math.max(...ye),
  };
}

export function alignBlocks(items: IdLayout[], op: AlignOp): IdLayout[] {
  if (items.length < 2) return items;
  const b = bounds(items);
  return items.map(({ id, layout }) => {
    const next = { ...layout };
    switch (op) {
      case "left": next.x = b.minX; break;
      case "right": next.x = b.maxX - layout.w; break;
      case "center-h": next.x = (b.minX + b.maxX) / 2 - layout.w / 2; break;
      case "top": next.y = b.minY; break;
      case "bottom": next.y = b.maxY - layout.h; break;
      case "middle-v": next.y = (b.minY + b.maxY) / 2 - layout.h / 2; break;
    }
    return { id, layout: next };
  });
}

export function distributeBlocks(items: IdLayout[], op: DistributeOp): IdLayout[] {
  if (items.length < 3) return items;
  const sorted = [...items].sort((a, b) =>
    op === "horizontal" ? a.layout.x - b.layout.x : a.layout.y - b.layout.y,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (op === "horizontal") {
    const totalSpan = (last.layout.x + last.layout.w) - first.layout.x;
    const totalW = sorted.reduce((sum, i) => sum + i.layout.w, 0);
    const gap = (totalSpan - totalW) / (sorted.length - 1);
    let cursor = first.layout.x;
    return sorted.map((it, idx) => {
      if (idx === 0) { cursor = it.layout.x + it.layout.w + gap; return it; }
      const next = { ...it.layout, x: cursor };
      cursor = next.x + next.w + gap;
      return { id: it.id, layout: next };
    });
  } else {
    const totalSpan = (last.layout.y + last.layout.h) - first.layout.y;
    const totalH = sorted.reduce((sum, i) => sum + i.layout.h, 0);
    const gap = (totalSpan - totalH) / (sorted.length - 1);
    let cursor = first.layout.y;
    return sorted.map((it, idx) => {
      if (idx === 0) { cursor = it.layout.y + it.layout.h + gap; return it; }
      const next = { ...it.layout, y: cursor };
      cursor = next.y + next.h + gap;
      return { id: it.id, layout: next };
    });
  }
}
