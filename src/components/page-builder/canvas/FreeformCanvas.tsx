import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import type { PageBlock } from "@/components/page-builder/types";
import { BlockFrame } from "./BlockFrame";
import { GuideOverlay } from "./GuideOverlay";
import { SelectionToolbar } from "./SelectionToolbar";
import { snapLayout } from "./snap";
import { alignBlocks, distributeBlocks, type AlignOp, type DistributeOp } from "./align";
import { useBlockClipboard } from "./useBlockClipboard";
import {
  type BlockLayout,
  type CanvasSettings,
  type LayoutMode,
  type DeviceMode,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_BLOCK_W,
  DEFAULT_BLOCK_H,
  DEVICE_SIZES,
  TEXT_BLOCK_TYPES,
  readLayout,
  withLayout,
} from "./types";

interface FreeformCanvasProps {
  blocks: PageBlock[];
  mode: LayoutMode;
  device: DeviceMode;
  settings: CanvasSettings;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  onUpdateBlocks: (next: PageBlock[], opts?: { commit?: boolean }) => void;
  onDuplicateBlock?: (block: PageBlock) => void;
  persona?: any;
}

interface MarqueeRect { x: number; y: number; w: number; h: number; }

function rectsIntersect(a: MarqueeRect, b: MarqueeRect) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export function FreeformCanvas({
  blocks, mode, device, settings,
  selectedIds, setSelectedIds, onUpdateBlocks, onDuplicateBlock,
  persona,
}: FreeformCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const clipboard = useBlockClipboard();

  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  const { w: canvasW, h: canvasH } = DEVICE_SIZES[device];

  // Fit-to-container scaling
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const fit = Math.min(1, (cr.width - 32) / canvasW);
      setScale(Math.max(0.2, fit));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [canvasW]);

  // Auto-place blocks that have no layout yet
  useEffect(() => {
    if (mode === "stack") return;
    let nextY = 24;
    let needsUpdate = false;
    const updated = blocks.map((b) => {
      const existing = readLayout(b.styles);
      if (existing) {
        nextY = Math.max(nextY, existing.y + existing.h + s.gutter);
        return b;
      }
      needsUpdate = true;
      const layout: BlockLayout = {
        x: Math.max(24, (canvasW - DEFAULT_BLOCK_W * 2) / 2),
        y: nextY,
        w: Math.min(DEFAULT_BLOCK_W * 2, canvasW - 48),
        h: DEFAULT_BLOCK_H,
      };
      nextY += layout.h + s.gutter;
      return { ...b, styles: withLayout(b.styles, layout) };
    });
    if (needsUpdate) onUpdateBlocks(updated, { commit: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canvasW, blocks.length]);

  const updateBlockLayout = (id: string, layout: BlockLayout, opts?: { commit?: boolean }) => {
    const snapped = snapLayout(layout, mode, s, canvasW);
    const next = blocks.map((b) => (b.id === id ? { ...b, styles: withLayout(b.styles, snapped) } : b));
    onUpdateBlocks(next, opts);
  };

  const moveSelection = (dx: number, dy: number, opts?: { commit?: boolean }) => {
    const next = blocks.map((b) => {
      if (!selectedIds.has(b.id)) return b;
      const cur = readLayout(b.styles);
      if (!cur) return b;
      const moved = snapLayout({ ...cur, x: cur.x + dx, y: cur.y + dy }, mode, s, canvasW);
      return { ...b, styles: withLayout(b.styles, moved) };
    });
    onUpdateBlocks(next, opts);
  };

  // Marquee selection
  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setEditingTextId(null);
    setSelectedIds(new Set());
    marqueeStart.current = { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
    setMarquee({ x: marqueeStart.current.x, y: marqueeStart.current.y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onCanvasPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!marqueeStart.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / scale;
    const cy = (e.clientY - rect.top) / scale;
    setMarquee({
      x: Math.min(marqueeStart.current.x, cx),
      y: Math.min(marqueeStart.current.y, cy),
      w: Math.abs(cx - marqueeStart.current.x),
      h: Math.abs(cy - marqueeStart.current.y),
    });
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
      if (l && rectsIntersect(marquee, l)) hit.add(b.id);
    }
    setSelectedIds(hit);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    marqueeStart.current = null;
    setMarquee(null);
  };

  // Layering ops via sort_order
  const reorderBlock = useCallback((id: string, op: "forward" | "backward" | "front" | "back") => {
    const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((b) => b.id === id);
    if (idx < 0) return;
    let target = idx;
    if (op === "forward") target = Math.min(sorted.length - 1, idx + 1);
    if (op === "backward") target = Math.max(0, idx - 1);
    if (op === "front") target = sorted.length - 1;
    if (op === "back") target = 0;
    if (target === idx) return;
    const [b] = sorted.splice(idx, 1);
    sorted.splice(target, 0, b);
    const remap = new Map(sorted.map((bb, i) => [bb.id, i]));
    const next = blocks.map((bb) => ({ ...bb, sort_order: remap.get(bb.id) ?? bb.sort_order }));
    onUpdateBlocks(next, { commit: true });
  }, [blocks, onUpdateBlocks]);

  // Selection ops
  const handleAlign = (op: AlignOp) => {
    const items = blocks
      .filter((b) => selectedIds.has(b.id))
      .map((b) => ({ id: b.id, layout: readLayout(b.styles)! }))
      .filter((it) => it.layout);
    const aligned = alignBlocks(items, op);
    const map = new Map(aligned.map((a) => [a.id, a.layout]));
    const next = blocks.map((b) => map.has(b.id) ? { ...b, styles: withLayout(b.styles, map.get(b.id)!) } : b);
    onUpdateBlocks(next, { commit: true });
  };
  const handleDistribute = (op: DistributeOp) => {
    const items = blocks
      .filter((b) => selectedIds.has(b.id))
      .map((b) => ({ id: b.id, layout: readLayout(b.styles)! }))
      .filter((it) => it.layout);
    const distributed = distributeBlocks(items, op);
    const map = new Map(distributed.map((a) => [a.id, a.layout]));
    const next = blocks.map((b) => map.has(b.id) ? { ...b, styles: withLayout(b.styles, map.get(b.id)!) } : b);
    onUpdateBlocks(next, { commit: true });
  };
  const handleDeleteSelection = () => {
    const next = blocks.filter((b) => !selectedIds.has(b.id));
    onUpdateBlocks(next, { commit: true });
    setSelectedIds(new Set());
  };
  const handleDuplicateSelection = () => {
    const toDupe = blocks.filter((b) => selectedIds.has(b.id));
    toDupe.forEach((b) => onDuplicateBlock?.(b));
  };
  const handleCopySelection = () => {
    const sel = blocks.filter((b) => selectedIds.has(b.id));
    if (sel.length) clipboard.copy(sel);
  };
  const handlePaste = useCallback(() => {
    const data = clipboard.read();
    if (!data.length) return;
    data.forEach((b) => {
      const l = readLayout(b.styles);
      const cloned: PageBlock = {
        ...b,
        styles: l ? withLayout(b.styles, { ...l, x: l.x + 16, y: l.y + 16 }) : b.styles,
      };
      onDuplicateBlock?.(cloned);
    });
  }, [clipboard, onDuplicateBlock]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "c") { e.preventDefault(); handleCopySelection(); }
      else if (meta && e.key === "v") { e.preventDefault(); handlePaste(); }
      else if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); handleDuplicateSelection(); }
      else if (meta && e.key === "]") { e.preventDefault(); selectedIds.forEach((id) => reorderBlock(id, "forward")); }
      else if (meta && e.key === "[") { e.preventDefault(); selectedIds.forEach((id) => reorderBlock(id, "backward")); }
      else if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.size) {
        e.preventDefault();
        handleDeleteSelection();
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && selectedIds.size) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        moveSelection(dx, dy, { commit: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, blocks]);

  // Sort blocks by sort_order so front layers render last
  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order),
    [blocks],
  );

  return (
    <div ref={wrapRef} className="relative w-full h-full flex items-start justify-center overflow-auto p-4">
      {/* Selection toolbar floats above the canvas frame */}
      <SelectionToolbar
        count={selectedIds.size}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onDuplicate={handleDuplicateSelection}
        onDelete={handleDeleteSelection}
      />

      <div
        style={{
          width: canvasW * scale,
          height: canvasH * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          className="relative bg-background rounded-xl border border-border/60 shadow-lg origin-top-left"
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${scale})`,
            touchAction: "none",
          }}
        >
          <GuideOverlay mode={mode} settings={s} width={canvasW} height={canvasH} />

          {orderedBlocks.map((b) => {
            const layout = readLayout(b.styles);
            if (!layout) return null;
            const isSelected = selectedIds.has(b.id);
            const outOfBounds = layout.x < 0 || layout.y < 0 || layout.x + layout.w > canvasW;
            const isEditingThis = editingTextId === b.id;
            const canEditText = TEXT_BLOCK_TYPES.has(b.block_type);

            return (
              <BlockFrame
                key={b.id}
                layout={layout}
                selected={isSelected || isEditingThis}
                outOfBounds={outOfBounds}
                scale={scale}
                onSelect={(e) => {
                  if (isEditingThis) return;
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
                onDoubleClick={() => {
                  if (canEditText) setEditingTextId(b.id);
                }}
                contextMenu={{
                  bringForward: () => reorderBlock(b.id, "forward"),
                  sendBackward: () => reorderBlock(b.id, "backward"),
                  bringToFront: () => reorderBlock(b.id, "front"),
                  sendToBack: () => reorderBlock(b.id, "back"),
                  duplicate: () => onDuplicateBlock?.(b),
                  deleteBlock: () => {
                    const next = blocks.filter((bb) => bb.id !== b.id);
                    onUpdateBlocks(next, { commit: true });
                  },
                  copy: () => clipboard.copy([b]),
                  paste: handlePaste,
                  canPaste: clipboard.hasContent(),
                }}
              >
                <BlockRenderer
                  block={b}
                  isEditing
                  persona={persona}
                  inlineEdit={isEditingThis}
                  onInlineEditCommit={(field, value) => {
                    const next = blocks.map((bb) =>
                      bb.id === b.id
                        ? { ...bb, content: { ...bb.content, [field]: value } }
                        : bb,
                    );
                    onUpdateBlocks(next, { commit: true });
                    setEditingTextId(null);
                  }}
                  onInlineEditCancel={() => setEditingTextId(null)}
                />
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
      </div>
    </div>
  );
}
