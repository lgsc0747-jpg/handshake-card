import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import type { PageBlock } from "@/components/page-builder/types";
import { BlockFrame } from "./BlockFrame";
import { GuideOverlay } from "./GuideOverlay";
import { snapLayout } from "./snap";
import {
  type BlockLayout,
  type CanvasSettings,
  type LayoutMode,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_BLOCK_W,
  DEFAULT_BLOCK_H,
  readLayout,
  withLayout,
} from "./types";

interface FreeformCanvasProps {
  blocks: PageBlock[];
  mode: LayoutMode;
  settings: CanvasSettings;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  onUpdateBlocks: (next: PageBlock[], opts?: { commit?: boolean }) => void;
  persona?: any;
  minHeight?: number;
}

interface MarqueeRect { x: number; y: number; w: number; h: number; }

function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export function FreeformCanvas({
  blocks,
  mode,
  settings,
  selectedIds,
  setSelectedIds,
  onUpdateBlocks,
  persona,
  minHeight = 1200,
}: FreeformCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setWidth(cr.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Auto-place blocks that have no layout yet
  useEffect(() => {
    if (mode === "stack" || width === 0) return;
    let nextY = s.paddingT;
    let needsUpdate = false;
    const updated = blocks.map((b) => {
      const existing = readLayout(b.styles);
      if (existing) {
        nextY = Math.max(nextY, existing.y + existing.h + s.gutter);
        return b;
      }
      needsUpdate = true;
      const layout: BlockLayout = {
        x: s.paddingL,
        y: nextY,
        w: Math.min(DEFAULT_BLOCK_W * 2, width - s.paddingL - s.paddingR),
        h: DEFAULT_BLOCK_H,
      };
      nextY += layout.h + s.gutter;
      return { ...b, styles: withLayout(b.styles, layout) };
    });
    if (needsUpdate) onUpdateBlocks(updated, { commit: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, width, blocks.length]);

  const updateBlockLayout = (id: string, layout: BlockLayout, opts?: { commit?: boolean }) => {
    const snapped = snapLayout(layout, mode, s, width);
    const next = blocks.map((b) => (b.id === id ? { ...b, styles: withLayout(b.styles, snapped) } : b));
    onUpdateBlocks(next, opts);
  };

  const moveSelection = (dx: number, dy: number, opts?: { commit?: boolean }) => {
    const next = blocks.map((b) => {
      if (!selectedIds.has(b.id)) return b;
      const cur = readLayout(b.styles);
      if (!cur) return b;
      const moved = snapLayout({ ...cur, x: cur.x + dx, y: cur.y + dy }, mode, s, width);
      return { ...b, styles: withLayout(b.styles, moved) };
    });
    onUpdateBlocks(next, opts);
  };

  // Marquee
  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedIds(new Set());
    marqueeStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMarquee({ x: marqueeStart.current.x, y: marqueeStart.current.y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onCanvasPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!marqueeStart.current) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const x = Math.min(marqueeStart.current.x, cx);
    const y = Math.min(marqueeStart.current.y, cy);
    const w = Math.abs(cx - marqueeStart.current.x);
    const h = Math.abs(cy - marqueeStart.current.y);
    setMarquee({ x, y, w, h });
  };
  const onCanvasPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (!marquee || !marqueeStart.current) {
      marqueeStart.current = null;
      setMarquee(null);
      return;
    }
    const hit = new Set<string>();
    for (const b of blocks) {
      const l = readLayout(b.styles);
      if (!l) continue;
      if (rectsIntersect(marquee, l)) hit.add(b.id);
    }
    setSelectedIds(hit);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    marqueeStart.current = null;
    setMarquee(null);
  };

  const totalHeight = Math.max(
    minHeight,
    ...blocks.map((b) => {
      const l = readLayout(b.styles);
      return l ? l.y + l.h + s.paddingB : 0;
    }),
  );

  return (
    <div
      ref={ref}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      className="relative w-full"
      style={{ height: totalHeight, touchAction: "none" }}
    >
      <GuideOverlay mode={mode} settings={s} width={width} height={totalHeight} />

      {blocks.map((b) => {
        const layout = readLayout(b.styles);
        if (!layout) return null;
        const isSelected = selectedIds.has(b.id);
        return (
          <BlockFrame
            key={b.id}
            layout={layout}
            selected={isSelected}
            onSelect={(e) => {
              if (e.shiftKey) {
                const next = new Set(selectedIds);
                if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                setSelectedIds(next);
              } else if (!isSelected) {
                setSelectedIds(new Set([b.id]));
              }
            }}
            onChange={(next, opts) => {
              if (selectedIds.has(b.id) && selectedIds.size > 1) {
                const dx = next.x - layout.x;
                const dy = next.y - layout.y;
                if (next.w === layout.w && next.h === layout.h) {
                  moveSelection(dx, dy, opts);
                  return;
                }
              }
              updateBlockLayout(b.id, next, opts);
            }}
          >
            <BlockRenderer block={b} isEditing persona={persona} />
          </BlockFrame>
        );
      })}

      {marquee && (
        <div
          className="absolute pointer-events-none border border-primary bg-primary/10 rounded-sm"
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
        />
      )}
    </div>
  );
}
