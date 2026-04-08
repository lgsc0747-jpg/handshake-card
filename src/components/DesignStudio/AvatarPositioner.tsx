import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Move, RotateCcw } from "lucide-react";

export interface AvatarPosition {
  x: number;
  y: number;
  scale: number;
}

interface AvatarPositionerProps {
  src: string;
  position: AvatarPosition;
  onPositionChange: (pos: AvatarPosition) => void;
}

export const DEFAULT_AVATAR_POSITION: AvatarPosition = { x: 50, y: 50, scale: 100 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);

export function AvatarPositioner({ src, position, onPositionChange }: AvatarPositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const startRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const positionRef = useRef(position);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  useEffect(() => { positionRef.current = position; }, [position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      setDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY, posX: positionRef.current.x, posY: positionRef.current.y };
      pinchRef.current = null;
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: getDistance(first, second) || 1, scale: positionRef.current.scale };
      setDragging(false);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !pointersRef.current.has(e.pointerId)) return;
    e.preventDefault();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      const pinchStart = pinchRef.current;
      if (!pinchStart) return;
      const distance = getDistance(first, second);
      const nextScale = clamp(Math.round((pinchStart.scale * distance) / pinchStart.distance), 100, 300);
      if (nextScale !== positionRef.current.scale) onPositionChange({ ...positionRef.current, scale: nextScale });
      return;
    }

    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - startRef.current.y) / rect.height) * 100;
    const newX = clamp(Math.round(startRef.current.posX - dx), 0, 100);
    const newY = clamp(Math.round(startRef.current.posY - dy), 0, 100);
    if (newX !== positionRef.current.x || newY !== positionRef.current.y) onPositionChange({ ...positionRef.current, x: newX, y: newY });
  }, [dragging, onPositionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values());
      startRef.current = { x: remaining.x, y: remaining.y, posX: positionRef.current.x, posY: positionRef.current.y };
      setDragging(true);
    } else {
      setDragging(false);
    }
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const nextScale = clamp(positionRef.current.scale + delta, 100, 300);
    onPositionChange({ ...positionRef.current, scale: nextScale });
  }, [onPositionChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !showControls) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel, showControls]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Avatar Position</Label>
        <button type="button" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors" onClick={() => setShowControls(!showControls)}>
          <Move className="w-3 h-3" />
          {showControls ? "Done" : "Adjust"}
        </button>
      </div>

      {showControls && (
        <div className="space-y-2">
          <div
            ref={containerRef}
            className="relative h-32 w-full select-none overflow-hidden rounded-xl border-2 border-dashed border-primary/40 touch-none overscroll-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: "none" }}
          >
            <img src={src} alt="Avatar" className="w-full h-full pointer-events-none" draggable={false} style={{
              objectFit: "cover",
              objectPosition: `${position.x}% ${position.y}%`,
              transform: `scale(${position.scale / 100})`,
              transformOrigin: `${position.x}% ${position.y}%`,
            }} />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-white/50 shadow-lg" />
            </div>
            <div className="absolute bottom-1 left-1 right-1 text-center">
              <span className="text-[9px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                Drag to reposition • Pinch/scroll to zoom ({position.scale}%)
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Position: {position.x}%, {position.y}%</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => onPositionChange(DEFAULT_AVATAR_POSITION)}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
