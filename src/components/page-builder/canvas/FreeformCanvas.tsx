import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import type { PageBlock } from "@/components/page-builder/types";
import { BlockFrame } from "./BlockFrame";
import { GuideOverlay } from "./GuideOverlay";
import { SelectionToolbar, type TextAlign } from "./SelectionToolbar";
import { snapLayout, snapToSmartGuides } from "./snap";
import { alignBlocks, distributeBlocks, type AlignOp, type DistributeOp } from "./align";
import { useBlockClipboard } from "./useBlockClipboard";
import { GripVertical, Plus } from "lucide-react";
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

function setContentPath(content: Record<string, any>, path: string, value: string) {
  const next = { ...content };
  const parts = path.split(".");
  let cursor: any = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const existing = cursor[key];
    const nextKey = parts[i + 1];
    const clone = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === "object"
        ? { ...existing }
        : /^\d+$/.test(nextKey)
          ? []
          : {};
    cursor[key] = clone;
    cursor = clone;
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
}

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
  const [activeDrag, setActiveDrag] = useState<{ id: string; layout: BlockLayout } | null>(null);
  /** When a multi-selected block starts dragging, capture every selected block's
   *  starting layout so we can apply (endpoint - start) deltas to all of them
   *  on every move without accumulating error. */
  const multiDragStart = useRef<{ anchorId: string; anchor: BlockLayout; layouts: Map<string, BlockLayout> } | null>(null);
  const clipboard = useBlockClipboard();

  const s = { ...DEFAULT_CANVAS_SETTINGS, ...settings };
  const sections: CanvasSection[] = s.sections?.length ? s.sections : DEFAULT_CANVAS_SETTINGS.sections;
  const { w: canvasW } = DEVICE_SIZES[device];
  const canvasH = sections.reduce((sum, sec) => sum + sec.height, 0);
  const overflowPadding = Math.max(120, Math.min(800, s.overflowPadding ?? DEFAULT_CANVAS_SETTINGS.overflowPadding));


  const fitCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const availableW = Math.max(240, wrap.clientWidth - 64);
    const availableH = Math.max(240, wrap.clientHeight - 96);
    const fit = Math.min(1, availableW / canvasW, availableH / canvasH);
    const nextScale = Math.max(0.1, fit);
    setScale(nextScale);
    // After layout settles (double rAF), center via actual scrollWidth/Height.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const w = wrapRef.current;
      if (!w) return;
      w.scrollLeft = Math.max(0, (w.scrollWidth - w.clientWidth) / 2);
      w.scrollTop = Math.max(0, (w.scrollHeight - w.clientHeight) / 2);
    }));
  }, [canvasH, canvasW, setScale]);

  // Initial fit once the wrapper has a real size, then refit when the wrapper
  // size changes substantially (e.g. inspector toggled, window resized) AS
  // LONG AS the user hasn't manually zoomed. Once they zoom, we leave them be.
  const lastWrapSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 100 || h < 100) return;
      const last = lastWrapSize.current;
      const significant = Math.abs(w - last.w) > 24 || Math.abs(h - last.h) > 24;
      if (!significant && last.w > 0) return;
      lastWrapSize.current = { w, h };
      fitCanvas();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitCanvas]);

  useEffect(() => {
    if (fitRequest > 0) {
      // Manual fit request — always refit and reset baseline.
      const wrap = wrapRef.current;
      if (wrap) lastWrapSize.current = { w: wrap.clientWidth, h: wrap.clientHeight };
      fitCanvas();
    }
  }, [fitRequest, fitCanvas]);

  // Ctrl/Cmd + wheel = zoom around cursor. Plain wheel still scrolls.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const cursorX = e.clientX - rect.left + wrap.scrollLeft;
      const cursorY = e.clientY - rect.top + wrap.scrollTop;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextScale = Math.max(0.1, Math.min(4, scale * factor));
      const ratio = nextScale / scale;
      setScale(nextScale);
      requestAnimationFrame(() => {
        if (!wrapRef.current) return;
        wrapRef.current.scrollLeft = cursorX * ratio - (e.clientX - rect.left);
        wrapRef.current.scrollTop = cursorY * ratio - (e.clientY - rect.top);
      });
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel as any);
  }, [scale, setScale]);


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

  const updateBlockLayout = (id: string, layout: BlockLayout, opts?: { commit?: boolean }, others?: BlockLayout[]) => {
    let snapped = snapLayout(layout, s, canvasW);
    if (s.smartSnap !== false && others && others.length) {
      snapped = snapToSmartGuides(snapped, others, canvasW, canvasH, s.snapTolerance ?? 6, s.snapMode ?? "edges-centers");
    }
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

  /** Move every selected block by (endpoint - originalAnchor) deltas, applied
   *  to each block's ORIGINAL captured layout. No accumulation. */
  const moveSelectionFromStart = (dx: number, dy: number, opts?: { commit?: boolean }) => {
    const starts = multiDragStart.current?.layouts;
    if (!starts) return;
    const next = blocks.map((b) => {
      const start = starts.get(b.id);
      if (!start) return b;
      const moved = snapLayout({ ...start, x: start.x + dx, y: start.y + dy }, s, canvasW);
      return { ...b, styles: withLayout(b.styles, moved) };
    });
    onUpdateBlocks(next, opts);
  };

  const setTextAlignSelection = (a: TextAlign) => {
    const next = blocks.map((b) =>
      selectedIds.has(b.id) ? { ...b, styles: { ...b.styles, alignment: a } } : b,
    );
    onUpdateBlocks(next, { commit: true });
  };

  // Sections: add / resize / reorder
  const addSection = () => {
    const next: CanvasSection[] = [...sections, { id: uid(), height: DEFAULT_SECTION_H }];
    onUpdateSettings({ ...s, sections: next }, { commit: true });
  };
  const resizeSection = (id: string, height: number, opts?: { commit?: boolean }) => {
    const next = sections.map((sec) => sec.id === id ? { ...sec, height: Math.max(MIN_SECTION_H, Math.round(height)) } : sec);
    onUpdateSettings({ ...s, sections: next }, opts);
  };
  const deleteSection = (id: string) => {
    if (sections.length <= 1) return;
    const next = sections.filter((sec) => sec.id !== id);
    onUpdateSettings({ ...s, sections: next }, { commit: true });
  };
  const reorderSection = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const oldTop = new Map<string, number>();
    let running = 0;
    sections.forEach((sec) => { oldTop.set(sec.id, running); running += sec.height; });

    const fromIndex = sections.findIndex((sec) => sec.id === fromId);
    const toIndex = sections.findIndex((sec) => sec.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextSections = [...sections];
    const [moved] = nextSections.splice(fromIndex, 1);
    nextSections.splice(toIndex, 0, moved);

    const newTop = new Map<string, number>();
    running = 0;
    nextSections.forEach((sec) => { newTop.set(sec.id, running); running += sec.height; });
    const oldRanges = sections.map((sec) => ({ id: sec.id, top: oldTop.get(sec.id) ?? 0, bottom: (oldTop.get(sec.id) ?? 0) + sec.height }));
    const nextBlocks = blocks.map((b) => {
      const layout = readLayout(b.styles);
      if (!layout) return b;
      const centerY = layout.y + layout.h / 2;
      const range = oldRanges.find((r) => centerY >= r.top && centerY < r.bottom) ?? oldRanges[oldRanges.length - 1];
      const delta = (newTop.get(range.id) ?? 0) - (oldTop.get(range.id) ?? 0);
      return { ...b, styles: withLayout(b.styles, { ...layout, y: layout.y + delta }) };
    });
    onUpdateSettings({ ...s, sections: nextSections }, { commit: true });
    onUpdateBlocks(nextBlocks, { commit: true });
  };

  // Marquee + Pan
  const startPan = useCallback((e: RPointerEvent<HTMLElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    e.preventDefault();
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (panTool || spaceHeld) {
      startPan(e);
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
    if (panStart.current && wrapRef.current) {
      wrapRef.current.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
      wrapRef.current.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y);
      return;
    }
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
    if (panStart.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(panStart.current.pointerId); } catch {}
      panStart.current = null;
      return;
    }
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
      if (e.code === "Space" && !inForm) {
        // Prevent default so the page doesn't scroll while panning.
        e.preventDefault();
        setSpaceHeld(true);
      }
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
        e.preventDefault(); setScale(Math.min(4, Math.max(0.1, scale + 0.1)));
      } else if (meta && e.key === "-") {
        e.preventDefault(); setScale(Math.min(4, Math.max(0.1, scale - 0.1)));
      } else if (meta && e.key === "0") {
        e.preventDefault(); fitCanvas();
      } else if (meta && selectedIds.size && ["l", "e", "r", "j"].includes(e.key.toLowerCase())) {
        // Text alignment: ⌘L / ⌘E (center) / ⌘R / ⌘J
        // Block alignment when ⇧ is held: ⌘⇧L (left), ⌘⇧E (center-h), ⌘⇧R (right), ⌘⇧J (justify horizontally distribute)
        const k = e.key.toLowerCase();
        if (e.shiftKey) {
          e.preventDefault();
          if (k === "l") handleAlign("left");
          else if (k === "e") handleAlign("center-h");
          else if (k === "r") handleAlign("right");
          else if (k === "j") handleDistribute("horizontal");
        } else {
          const hasText = blocks.some((b) => selectedIds.has(b.id) && TEXT_BLOCK_TYPES.has(b.block_type));
          if (!hasText) return;
          e.preventDefault();
          const map: Record<string, TextAlign> = { l: "left", e: "center", r: "right", j: "justify" };
          setTextAlignSelection(map[k]);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setSpaceHeld(false); }
    };
    // Use capture phase and non-passive so preventDefault on Space works
    // before the browser starts scrolling the window.
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
      window.removeEventListener("keyup", onKeyUp, { capture: true } as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, blocks, scale]);

  // Sort blocks by sort_order so front layers render last
  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order),
    [blocks],
  );

  const isPanning = panTool || spaceHeld;

  // Selection-derived text alignment state
  const selectedBlocks = blocks.filter((b) => selectedIds.has(b.id));
  const hasTextBlock = selectedBlocks.some((b) => TEXT_BLOCK_TYPES.has(b.block_type));
  const firstTextAlign = (selectedBlocks.find((b) => TEXT_BLOCK_TYPES.has(b.block_type))?.styles?.alignment ?? "left") as TextAlign;

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-900">
      {/* Selection toolbar — sits at the viewport bottom, never overlaps the
          top nav bar and doesn't move with canvas scroll. */}
      <SelectionToolbar
        count={selectedIds.size}
        textAlign={firstTextAlign}
        hasTextBlock={hasTextBlock}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onSetTextAlign={setTextAlignSelection}
        onDuplicate={handleDuplicateSelection}
        onDelete={handleDeleteSelection}
      />
      <div
        ref={wrapRef}
        className="flex-1 overflow-auto"
        style={{
          cursor: isPanning ? "grab" : undefined,
          overscrollBehavior: "contain",
          touchAction: isPanning ? "none" : "auto",
        }}
        onPointerDown={(e) => {
          if (!isPanning || e.target !== e.currentTarget) return;
          startPan(e);
        }}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        <div
          className="flex items-start justify-center min-w-max min-h-full pt-24"
          style={{ paddingLeft: overflowPadding, paddingRight: overflowPadding, paddingBottom: Math.max(220, overflowPadding) }}
          onPointerDown={(e) => {
            if (!isPanning || e.target !== e.currentTarget) return;
            startPan(e);
          }}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
        >


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
              className="relative rounded-xl shadow-2xl origin-top-left overflow-visible ring-1 ring-white/10"
              style={{
                width: canvasW,
                height: canvasH,
                transform: `scale(${scale})`,
                touchAction: "none",
                cursor: isPanning ? "grab" : "default",
              }}
            >
              {/* Page background fill */}
              <div className="absolute inset-0 pointer-events-none" style={backgroundToCss(s.background)} />

              {/* Section bands (visual + per-section bg) */}
              {(() => {
                let y = 0;
                return sections.map((sec) => {
                  const top = y;
                  y += sec.height;
                  return (
                    <div
                      key={sec.id}
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{ top, height: sec.height }}
                    >
                      {sec.bg && (
                        <div className="absolute inset-0 pointer-events-none" style={backgroundToCss(sec.bg)} />
                      )}
                      {/* Section divider line (editor only) */}
                      <div
                        className="absolute left-0 right-0 bottom-0 pointer-events-none"
                        style={{ borderBottom: "1px dashed rgb(59 130 246 / 0.3)" }}
                      />
                      {/* Resize handle on bottom edge */}
                      <SectionDragHandle
                        id={sec.id}
                        index={sections.findIndex((s2) => s2.id === sec.id)}
                        sections={sections}
                        scale={scale}
                        onReorder={reorderSection}
                      />

                      <SectionResizeHandle
                        height={sec.height}
                        scale={scale}
                        onResize={(h, commit) => resizeSection(sec.id, h, { commit })}
                      />
                      {/* Section delete button (top-right, counter-scaled) */}
                      {sections.length > 1 && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }}
                          className="absolute z-30 pointer-events-auto rounded-md bg-black/60 text-white border border-white/20 flex items-center justify-center hover:bg-destructive transition-colors"
                          style={{
                            top: 8 / scale,
                            right: 8 / scale,
                            width: 24 / scale,
                            height: 24 / scale,
                            fontSize: 16 / scale,
                            lineHeight: 1,
                          }}
                          title="Delete section"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                });
              })()}

              <GuideOverlay
                settings={s}
                width={canvasW}
                height={canvasH}
                active={activeDrag?.layout ?? null}
                others={blocks
                  .filter((b) => b.id !== activeDrag?.id)
                  .map((b) => readLayout(b.styles))
                  .filter((l): l is BlockLayout => !!l)}
              />


              {orderedBlocks.map((b) => {
                const layout = readLayout(b.styles);
                if (!layout) return null;
                const isSelected = selectedIds.has(b.id);
                const outOfBounds = layout.x < 0 || layout.x + layout.w > canvasW || layout.y < 0 || layout.y + layout.h > canvasH;
                const isEditingThis = editingTextId === b.id;
                const canEditText = TEXT_BLOCK_TYPES.has(b.block_type);

                return (
                  <BlockFrame
                    key={b.id}
                    layout={layout}
                    selected={isSelected || isEditingThis}
                    outOfBounds={outOfBounds}
                    scale={scale}
                    panActive={isPanning}
                    interactiveChildren={isEditingThis}
                    dragPreview={s.dragPreview ?? "live"}
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
                      const isMultiMove =
                        selectedIds.has(b.id) && selectedIds.size > 1 &&
                        next.w === layout.w && next.h === layout.h;
                      if (isMultiMove && multiDragStart.current?.anchorId === b.id) {
                        const anchor = multiDragStart.current.anchor;
                        const dx = next.x - anchor.x;
                        const dy = next.y - anchor.y;
                        moveSelectionFromStart(dx, dy, opts);
                        return;
                      }
                      const others = blocks
                        .filter((bb) => bb.id !== b.id)
                        .map((bb) => readLayout(bb.styles))
                        .filter((l): l is BlockLayout => !!l);
                      updateBlockLayout(b.id, next, opts, others);
                    }}
                    onAutoSize={(next) => updateBlockLayout(b.id, next)}
                    onDragStateChange={(isDragging, l) => {
                      if (isDragging && l) {
                        setActiveDrag({ id: b.id, layout: l });
                        // Capture starts for every selected block on first drag fire.
                        if (!multiDragStart.current && selectedIds.has(b.id) && selectedIds.size > 1) {
                          const map = new Map<string, BlockLayout>();
                          blocks.forEach((bb) => {
                            if (selectedIds.has(bb.id)) {
                              const ll = readLayout(bb.styles);
                              if (ll) map.set(bb.id, ll);
                            }
                          });
                          multiDragStart.current = { anchorId: b.id, anchor: { ...layout }, layouts: map };
                        }
                      } else {
                        setActiveDrag(null);
                        multiDragStart.current = null;
                      }
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
                            ? { ...bb, content: setContentPath(bb.content, field, value) }
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
      className="absolute left-0 right-0 bottom-0 z-20 cursor-ns-resize pointer-events-auto"
      style={{ height: 8, transform: "translateY(4px)" }}
      title="Drag to resize section"
    />
  );
}

function SectionDragHandle({
  id, index, sections, scale, onReorder,
}: {
  id: string;
  index: number;
  sections: CanvasSection[];
  scale: number;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const start = useRef<{ y: number; pointerId: number } | null>(null);
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = { y: e.clientY, pointerId: e.pointerId };
      }}
      onPointerMove={(e) => {
        // Visual feedback only — we resolve target on pointer up.
        if (!start.current) return;
        e.preventDefault();
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        const dy = (e.clientY - start.current.y) / Math.max(scale, 0.01);
        // Walk through section heights to find which slot the pointer landed in.
        let cursor = 0;
        let targetId = id;
        // Cumulative top of THIS section in canvas coords (not absolute screen).
        let myTop = 0;
        for (let i = 0; i < index; i += 1) myTop += sections[i].height;
        const dropY = myTop + dy;
        cursor = 0;
        for (const sec of sections) {
          if (dropY >= cursor && dropY < cursor + sec.height) {
            targetId = sec.id;
            break;
          }
          cursor += sec.height;
        }
        // Last section if dropped past the bottom.
        if (dropY >= cursor) targetId = sections[sections.length - 1].id;
        start.current = null;
        if (targetId !== id) onReorder(id, targetId);
      }}
      className="absolute z-30 pointer-events-auto flex items-center gap-1 rounded-md bg-black/60 text-white border border-white/20 px-2 py-1 text-[10px] font-medium cursor-grab active:cursor-grabbing hover:bg-black/75 select-none"
      style={{
        top: 8 / scale,
        left: 8 / scale,
        transform: `scale(${1 / Math.max(scale, 0.01)})`,
        transformOrigin: "top left",
        touchAction: "none",
      }}
      title="Drag up/down to reorder section"
    >
      <GripVertical className="w-3 h-3" /> Section {index + 1}
    </div>
  );
}


