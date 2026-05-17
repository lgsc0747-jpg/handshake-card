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
import { Plus } from "lucide-react";
import {
  type BlockLayout,
  type CanvasSettings,
  type DeviceMode,
  type CanvasSection,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_BLOCK_W,
  DEFAULT_BLOCK_H,
  DEFAULT_SECTION_H,
  MIN_SECTION_H,
  DEVICE_SIZES,
  TEXT_BLOCK_TYPES,
  readLayout,
  withLayout,
  backgroundToCss,
} from "./types";

interface FreeformCanvasProps {
  blocks: PageBlock[];
  device: DeviceMode;
  settings: CanvasSettings;
  scale: number;
  setScale: (scale: number) => void;
  fitRequest: number;
  panTool: boolean;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  onUpdateBlocks: (next: PageBlock[], opts?: { commit?: boolean }) => void;
  onUpdateSettings: (next: CanvasSettings, opts?: { commit?: boolean }) => void;
  onDuplicateBlock?: (block: PageBlock) => void;
  persona?: any;
}

interface MarqueeRect { x: number; y: number; w: number; h: number; }

function rectsIntersect(a: MarqueeRect, b: MarqueeRect) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export function FreeformCanvas({
  blocks, device, settings, scale, setScale, fitRequest, panTool,
  selectedIds, setSelectedIds, onUpdateBlocks, onUpdateSettings, onDuplicateBlock,
  persona,
}: FreeformCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number; pointerId: number } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const clipboard = useBlockClipboard();

  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  const sections: CanvasSection[] = s.sections?.length ? s.sections : DEFAULT_CANVAS_SETTINGS.sections;
  const { w: canvasW } = DEVICE_SIZES[device];
  const canvasH = sections.reduce((sum, sec) => sum + sec.height, 0);

  const fitCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = Math.min(1, (wrap.clientWidth - 64) / canvasW);
    setScale(Math.max(0.25, fit));
  }, [canvasW, setScale]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let didFit = false;
    const ro = new ResizeObserver(() => {
      if (didFit) return;
      fitCanvas();
      didFit = true;
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitCanvas]);

  useEffect(() => {
    if (fitRequest > 0) fitCanvas();
  }, [fitRequest, fitCanvas]);

  // Auto-place blocks that have no layout yet
  useEffect(() => {
    let nextY = 24;
    let needsUpdate = false;
    const updated = blocks.map((b) => {
      const existing = readLayout(b.styles);
      if (existing) {
        nextY = Math.max(nextY, existing.y + existing.h + 16);
        return b;
      }
      needsUpdate = true;
      const layout: BlockLayout = {
        x: Math.max(24, (canvasW - DEFAULT_BLOCK_W) / 2),
        y: nextY,
        w: Math.min(DEFAULT_BLOCK_W, canvasW - 48),
        h: DEFAULT_BLOCK_H,
      };
      nextY += layout.h + 16;
      return { ...b, styles: withLayout(b.styles, layout) };
    });
    if (needsUpdate) onUpdateBlocks(updated, { commit: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasW, blocks.length]);

  const updateBlockLayout = (id: string, layout: BlockLayout, opts?: { commit?: boolean }) => {
    const snapped = snapLayout(layout, s, canvasW);
    const next = blocks.map((b) => (b.id === id ? { ...b, styles: withLayout(b.styles, snapped) } : b));
    onUpdateBlocks(next, opts);
  };

  const moveSelection = (dx: number, dy: number, opts?: { commit?: boolean }) => {
    const next = blocks.map((b) => {
      if (!selectedIds.has(b.id)) return b;
      const cur = readLayout(b.styles);
      if (!cur) return b;
      const moved = snapLayout({ ...cur, x: cur.x + dx, y: cur.y + dy }, s, canvasW);
      return { ...b, styles: withLayout(b.styles, moved) };
    });
    onUpdateBlocks(next, opts);
  };

  // Sections: add / resize
  const addSection = () => {
    const next: CanvasSection[] = [...sections, { id: uid(), height: DEFAULT_SECTION_H }];
    onUpdateSettings({ ...s, sections: next }, { commit: true });
  };
  const resizeSection = (id: string, height: number, opts?: { commit?: boolean }) => {
    const next = sections.map((sec) => sec.id === id ? { ...sec, height: Math.max(MIN_SECTION_H, Math.round(height)) } : sec);
    onUpdateSettings({ ...s, sections: next }, opts);
  };

  // Marquee + Pan
  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const wrap = wrapRef.current;
    if (panTool || spaceHeld) {
      // pan: capture pointer on wrap, store starting scroll
      if (!wrap) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startSL = wrap.scrollLeft;
      const startST = wrap.scrollTop;
      const onMove = (ev: PointerEvent) => {
        wrap.scrollLeft = startSL - (ev.clientX - startX);
        wrap.scrollTop = startST - (ev.clientY - startY);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }
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
    const items = blocks.filter((b) => selectedIds.has(b.id)).map((b) => ({ id: b.id, layout: readLayout(b.styles)! })).filter((it) => it.layout);
    const aligned = alignBlocks(items, op);
    const map = new Map(aligned.map((a) => [a.id, a.layout]));
    const next = blocks.map((b) => map.has(b.id) ? { ...b, styles: withLayout(b.styles, map.get(b.id)!) } : b);
    onUpdateBlocks(next, { commit: true });
  };
  const handleDistribute = (op: DistributeOp) => {
    const items = blocks.filter((b) => selectedIds.has(b.id)).map((b) => ({ id: b.id, layout: readLayout(b.styles)! })).filter((it) => it.layout);
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
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inForm = t?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName);
      if (e.code === "Space" && !inForm) { setSpaceHeld(true); }
      if (inForm) return;
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
      } else if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault(); setScaleClamped(scale + 0.1);
      } else if (meta && e.key === "-") {
        e.preventDefault(); setScaleClamped(scale - 0.1);
      } else if (meta && e.key === "0") {
        e.preventDefault(); fitToScreen();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, blocks, scale]);

  // Sort blocks by sort_order so front layers render last
  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order),
    [blocks],
  );

  const isPanning = panTool || spaceHeld;

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-900">
      <div
        ref={wrapRef}
        className="flex-1 overflow-auto"
        style={{ cursor: isPanning ? "grab" : undefined }}
      >
        <div className="flex items-start justify-center min-w-max min-h-full p-8 pb-24">
          {/* Selection toolbar */}
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
              height: canvasH * scale + 56, // room for add-section button
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              ref={canvasRef}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              className="relative rounded-xl shadow-2xl origin-top-left overflow-hidden ring-1 ring-white/10"
              style={{
                width: canvasW,
                height: canvasH,
                transform: `scale(${scale})`,
                touchAction: "none",
                cursor: isPanning ? "grab" : "default",
              }}
            >
              {/* Page background fill */}
              <div className="absolute inset-0" style={backgroundToCss(s.background)} />

              {/* Section bands (visual + per-section bg) */}
              {(() => {
                let y = 0;
                return sections.map((sec) => {
                  const top = y;
                  y += sec.height;
                  return (
                    <div
                      key={sec.id}
                      className="absolute left-0 right-0"
                      style={{ top, height: sec.height }}
                    >
                      {sec.bg && (
                        <div className="absolute inset-0" style={backgroundToCss(sec.bg)} />
                      )}
                      {/* Section divider line (editor only) */}
                      <div
                        className="absolute left-0 right-0 bottom-0 pointer-events-none"
                        style={{ borderBottom: "1px dashed rgb(59 130 246 / 0.3)" }}
                      />
                      {/* Resize handle on bottom edge */}
                      <SectionResizeHandle
                        height={sec.height}
                        scale={scale}
                        onResize={(h, commit) => resizeSection(sec.id, h, { commit })}
                      />
                    </div>
                  );
                });
              })()}

              <GuideOverlay settings={s} width={canvasW} height={canvasH} />

              {orderedBlocks.map((b) => {
                const layout = readLayout(b.styles);
                if (!layout) return null;
                const isSelected = selectedIds.has(b.id);
                const outOfBounds = layout.x + layout.w < 0 || layout.x > canvasW || layout.y > canvasH;
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
                    onDoubleClick={() => { if (canEditText) setEditingTextId(b.id); }}
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
                  className="absolute pointer-events-none"
                  style={{
                    left: marquee.x,
                    top: marquee.y,
                    width: marquee.w,
                    height: marquee.h,
                    background: "rgb(59 130 246 / 0.12)",
                    border: "1px solid #3b82f6",
                    borderRadius: 2,
                  }}
                />
              )}
            </div>

            {/* Add Section button below the canvas (in scaled space) */}
            <div
              style={{
                position: "absolute",
                top: canvasH * scale + 12,
                left: 0,
                width: canvasW * scale,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={addSection}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-white/10 shadow-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>
          </div>
        </div>
      </div>

      <CanvasNavBar
        scale={scale}
        panTool={panTool}
        setPanTool={setPanTool}
        zoomIn={() => setScaleClamped(scale + 0.1)}
        zoomOut={() => setScaleClamped(scale - 0.1)}
        fit={fitToScreen}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    </div>
  );
}

// ─── Section resize handle ───────────────────────────────────────────────
function SectionResizeHandle({
  height, scale, onResize,
}: { height: number; scale: number; onResize: (h: number, commit?: boolean) => void }) {
  const start = useRef<{ y: number; h: number } | null>(null);
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = { y: e.clientY, h: height };
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const dy = (e.clientY - start.current.y) / scale;
        onResize(start.current.h + dy);
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        const dy = (e.clientY - start.current.y) / scale;
        onResize(start.current.h + dy, true);
        start.current = null;
      }}
      className="absolute left-0 right-0 bottom-0 z-20 cursor-ns-resize"
      style={{ height: 8, transform: "translateY(4px)" }}
      title="Drag to resize section"
    />
  );
}
