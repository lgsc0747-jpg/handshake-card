import { useState, useRef, useCallback, useEffect } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { BlockLayout } from "./types";
import { MIN_BLOCK_W, MIN_BLOCK_H } from "./types";
import { BlockContextMenu } from "./BlockContextMenu";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

interface BlockFrameProps {
  layout: BlockLayout;
  selected: boolean;
  outOfBounds?: boolean;
  /** Display-to-canvas scale (e.g. 0.5 when canvas is scaled to fit). */
  scale?: number;
  onSelect: (e: React.PointerEvent) => void;
  onChange: (next: BlockLayout, opts?: { commit?: boolean }) => void;
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
  children: React.ReactNode;
}

export function BlockFrame({
  layout, selected, outOfBounds, scale = 1,
  onSelect, onChange, onDoubleClick, contextMenu, children,
}: BlockFrameProps) {
  const startRef = useRef<{ x: number; y: number; layout: BlockLayout; handle: Handle } | null>(null);
  const [dragging, setDragging] = useState(false);

  const begin = useCallback(
    (handle: Handle) => (e: RPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY, layout: { ...layout }, handle };
      setDragging(true);
    },
    [layout],
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
      onChange(next);
    },
    [onChange, scale],
  );

  const end = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (!startRef.current) return;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      onChange(layout, { commit: true });
      startRef.current = null;
      setDragging(false);
    },
    [layout, onChange],
  );

  const handleStyle = "absolute bg-background border border-primary rounded-sm shadow-sm";
  const corner = "w-2.5 h-2.5";
  const edge = "bg-transparent border-0 shadow-none";

  const frame = (
    <div
      className={cn(
        "absolute group select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        selected && !outOfBounds && "ring-2 ring-primary ring-offset-1 ring-offset-background z-10",
        outOfBounds && "ring-2 ring-destructive ring-offset-1 ring-offset-background z-10",
      )}
      style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h }}
      onPointerDown={(e) => { onSelect(e); begin("move")(e); }}
      onPointerMove={move}
      onPointerUp={end}
      onDoubleClick={onDoubleClick}
    >
      <div className="w-full h-full overflow-hidden pointer-events-none">{children}</div>

      {selected && (
        <>
          <div onPointerDown={begin("n")} className={cn(handleStyle, edge, "left-2 right-2 -top-1 h-2 cursor-ns-resize")} />
          <div onPointerDown={begin("s")} className={cn(handleStyle, edge, "left-2 right-2 -bottom-1 h-2 cursor-ns-resize")} />
          <div onPointerDown={begin("e")} className={cn(handleStyle, edge, "top-2 bottom-2 -right-1 w-2 cursor-ew-resize")} />
          <div onPointerDown={begin("w")} className={cn(handleStyle, edge, "top-2 bottom-2 -left-1 w-2 cursor-ew-resize")} />
          <div onPointerDown={begin("nw")} className={cn(handleStyle, corner, "-top-1.5 -left-1.5 cursor-nwse-resize")} />
          <div onPointerDown={begin("ne")} className={cn(handleStyle, corner, "-top-1.5 -right-1.5 cursor-nesw-resize")} />
          <div onPointerDown={begin("sw")} className={cn(handleStyle, corner, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} />
          <div onPointerDown={begin("se")} className={cn(handleStyle, corner, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} />
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

useEffect;
