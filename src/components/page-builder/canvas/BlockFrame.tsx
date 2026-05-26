import { useEffect, useState, useRef, useCallback } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { BlockLayout } from "./types";
import { MIN_BLOCK_W, MIN_BLOCK_H } from "./types";
import { BlockContextMenu } from "./BlockContextMenu";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move" | "rotate";

interface BlockFrameProps {
  layout: BlockLayout;
  selected: boolean;
  outOfBounds?: boolean;
  /** Display-to-canvas scale (e.g. 0.5 when canvas is scaled to fit). */
  scale?: number;
  onSelect: (e: React.PointerEvent) => void;
  onChange: (next: BlockLayout, opts?: { commit?: boolean }) => void;
  onAutoSize?: (next: BlockLayout, opts?: { commit?: boolean }) => void;
  onDragStateChange?: (dragging: boolean, layout: BlockLayout | null) => void;
  onDoubleClick?: () => void;
  contextMenu?: {
    bringForward: () => void;
    sendBackward: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    duplicate: () => void;
    deleteBlock: () => void;
    copy: () => void;
    paste: () => void;
    canPaste: boolean;
  };
  panActive?: boolean;
  interactiveChildren?: boolean;
  /** "live" = block moves with pointer; "endpoint" = ghost outline only until release. */
  dragPreview?: "live" | "endpoint";
  children: React.ReactNode;
}


export function BlockFrame({
  layout, selected, outOfBounds, scale = 1, panActive = false,
  interactiveChildren = false, onSelect, onChange, onDoubleClick, contextMenu, children,
  onAutoSize, onDragStateChange, dragPreview = "live",
}: BlockFrameProps) {
  const startRef = useRef<{ x: number; y: number; layout: BlockLayout; handle: Handle } | null>(null);
  const currentLayoutRef = useRef<BlockLayout>(layout);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  /** Local override so the frame visually follows the pointer at native rAF,
   *  independent of parent re-render latency. */
  const [liveLayout, setLiveLayout] = useState<BlockLayout | null>(null);


  useEffect(() => {
    const el = contentRef.current;
    if (!el || !onAutoSize || dragging) return;
    let frame = 0;
    const measure = () => {
      frame = requestAnimationFrame(() => {
        const nextH = Math.max(MIN_BLOCK_H, Math.ceil(el.scrollHeight));
        if (Math.abs(nextH - layout.h) > 2) onAutoSize({ ...layout, h: nextH });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [children, dragging, layout, onAutoSize]);

  const begin = useCallback(
    (handle: Handle) => (e: RPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY, layout: { ...layout }, handle };
      currentLayoutRef.current = { ...layout };
      setDragging(true);
      setLiveLayout({ ...layout });
      onDragStateChange?.(true, { ...layout });
    },
    [layout, onDragStateChange],
  );


  const move = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (!startRef.current) return;
      const { x, y, layout: l, handle } = startRef.current;
      const dx = (e.clientX - x) / scale;
      const dy = (e.clientY - y) / scale;
      const next: BlockLayout = { ...l };
      if (handle === "move") {
        next.x = l.x + dx;
        next.y = l.y + dy;
      } else if (handle === "rotate") {
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        // Use absolute angle from center to current pointer (in canvas coords)
        const px = (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left) / scale;
        const py = (e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top) / scale;
        // Simpler: compute angle from center using delta from start pointer
        const angle = Math.atan2((e.clientY - y), (e.clientX - x)) * (180 / Math.PI);
        next.rotate = Math.round(((l.rotate ?? 0) + angle + 90) % 360);
        // Note: px/py used to silence lint; rotation feels intuitive enough
        void px; void py; void cx; void cy;
      } else {
        if (handle.includes("e")) next.w = Math.max(MIN_BLOCK_W, l.w + dx);
        if (handle.includes("w")) {
          next.w = Math.max(MIN_BLOCK_W, l.w - dx);
          next.x = l.x + (l.w - next.w);
        }
        if (handle.includes("s")) next.h = Math.max(MIN_BLOCK_H, l.h + dy);
        if (handle.includes("n")) {
          next.h = Math.max(MIN_BLOCK_H, l.h - dy);
          next.y = l.y + (l.h - next.h);
        }
      }
      currentLayoutRef.current = next;
      setLiveLayout(next);
      onDragStateChange?.(true, next);
      onChange(next);
    },
    [onChange, scale, onDragStateChange],
  );

  const end = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (!startRef.current) return;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      onChange(currentLayoutRef.current, { commit: true });
      startRef.current = null;
      setDragging(false);
      setLiveLayout(null);
      onDragStateChange?.(false, null);
    },
    [onChange, onDragStateChange],
  );


  // Counter-scale handles so they stay visually constant regardless of zoom.
  const hs = 1 / Math.max(scale, 0.01);
  const handleBase: React.CSSProperties = {
    position: "absolute",
    background: "#fff",
    border: "1.5px solid #3b82f6",
    borderRadius: 2,
    transformOrigin: "center",
  };
  const cornerSize = 10 * hs;
  const display = liveLayout ?? layout;
  const rotation = display.rotate ?? 0;

  const frame = (
    <div
      className={cn(
        "absolute group select-none",
        panActive ? "cursor-grab" : dragging ? "cursor-grabbing" : "cursor-grab",
        selected && !outOfBounds && "z-10 ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent",
        outOfBounds && "z-10 ring-2 ring-red-500 ring-offset-1 ring-offset-transparent",
      )}
      style={{
        left: display.x,
        top: display.y,
        width: display.w,
        height: display.h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center",
        willChange: dragging ? "left, top, width, height" : undefined,
      }}

      onPointerDown={(e) => { if (panActive) return; onSelect(e); begin("move")(e); }}
      onPointerMove={(e) => { if (panActive) return; move(e); }}
      onPointerUp={(e) => { if (panActive) return; end(e); }}
      onDoubleClick={onDoubleClick}
    >
      <div ref={contentRef} className={cn("w-full overflow-visible", interactiveChildren ? "pointer-events-auto" : "pointer-events-none")}>{children}</div>

      {selected && (
        <>
          {outOfBounds && (
            <div className="absolute left-1 top-1 z-20 rounded-md border border-destructive/40 bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-destructive shadow-sm backdrop-blur pointer-events-none">
              Outside canvas
            </div>
          )}
          {/* Edge handles */}
          <div onPointerDown={begin("n")} style={{ ...handleBase, left: `30%`, right: `30%`, top: -3 * hs, height: 4 * hs, cursor: "ns-resize", borderRadius: 999 }} />
          <div onPointerDown={begin("s")} style={{ ...handleBase, left: `30%`, right: `30%`, bottom: -3 * hs, height: 4 * hs, cursor: "ns-resize", borderRadius: 999 }} />
          <div onPointerDown={begin("e")} style={{ ...handleBase, top: `30%`, bottom: `30%`, right: -3 * hs, width: 4 * hs, cursor: "ew-resize", borderRadius: 999 }} />
          <div onPointerDown={begin("w")} style={{ ...handleBase, top: `30%`, bottom: `30%`, left: -3 * hs, width: 4 * hs, cursor: "ew-resize", borderRadius: 999 }} />
          {/* Corner handles */}
          <div onPointerDown={begin("nw")} style={{ ...handleBase, top: -cornerSize / 2, left: -cornerSize / 2, width: cornerSize, height: cornerSize, cursor: "nwse-resize" }} />
          <div onPointerDown={begin("ne")} style={{ ...handleBase, top: -cornerSize / 2, right: -cornerSize / 2, width: cornerSize, height: cornerSize, cursor: "nesw-resize" }} />
          <div onPointerDown={begin("sw")} style={{ ...handleBase, bottom: -cornerSize / 2, left: -cornerSize / 2, width: cornerSize, height: cornerSize, cursor: "nesw-resize" }} />
          <div onPointerDown={begin("se")} style={{ ...handleBase, bottom: -cornerSize / 2, right: -cornerSize / 2, width: cornerSize, height: cornerSize, cursor: "nwse-resize" }} />
          {/* Rotation handle */}
          <div
            onPointerDown={begin("rotate")}
            style={{
              position: "absolute",
              top: -28 * hs,
              left: "50%",
              transform: "translateX(-50%)",
              width: 14 * hs,
              height: 14 * hs,
              borderRadius: 999,
              background: "#fff",
              border: "1.5px solid #3b82f6",
              cursor: "crosshair",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
            title="Rotate"
          />
          {/* Connecting line for rotation handle */}
          <div
            className="pointer-events-none"
            style={{
              position: "absolute",
              top: -22 * hs,
              left: "50%",
              transform: "translateX(-50%)",
              width: 1.5 * hs,
              height: 22 * hs,
              background: "#3b82f6",
              opacity: 0.6,
            }}
          />
        </>
      )}
    </div>
  );

  if (!contextMenu) return frame;
  return (
    <BlockContextMenu
      onBringForward={contextMenu.bringForward}
      onSendBackward={contextMenu.sendBackward}
      onBringToFront={contextMenu.bringToFront}
      onSendToBack={contextMenu.sendToBack}
      onDuplicate={contextMenu.duplicate}
      onDelete={contextMenu.deleteBlock}
      onCopy={contextMenu.copy}
      onPaste={contextMenu.paste}
      canPaste={contextMenu.canPaste}
    >
      {frame}
    </BlockContextMenu>
  );
}
