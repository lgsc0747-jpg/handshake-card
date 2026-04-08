import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

interface ImageCropperModalProps {
  src: string;
  /** Aspect ratio of the display area (width / height). Null = square */
  cropAspectRatio?: number | null;
  /** Label for the crop area, e.g. "Card Background 320×200" */
  cropLabel?: string;
  initialPosition?: CropPosition;
  onConfirm: (position: CropPosition) => void;
  onCancel: () => void;
}

const DEFAULT_POS: CropPosition = { x: 50, y: 50, scale: 100 };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);

export function ImageCropperModal({
  src,
  cropAspectRatio = 1,
  cropLabel,
  initialPosition,
  onConfirm,
  onCancel,
}: ImageCropperModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CropPosition>(initialPosition ?? DEFAULT_POS);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [cropSize, setCropSize] = useState({ w: 0, h: 0 });

  const dragging = useRef(false);
  const startRef = useRef({ cx: 0, cy: 0, px: 0, py: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  // Load natural image size
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // Calculate crop box size to fit viewport
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = Math.min(vw * 0.85, 600);
      const maxH = Math.min(vh * 0.6, 500);
      const ar = cropAspectRatio ?? 1;

      let w = maxW;
      let h = w / ar;
      if (h > maxH) { h = maxH; w = h * ar; }
      setCropSize({ w: Math.round(w), h: Math.round(h) });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [cropAspectRatio]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragging.current = true;
      startRef.current = { cx: e.clientX, cy: e.clientY, px: posRef.current.x, py: posRef.current.y };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: dist(a, b) || 1, scale: posRef.current.scale };
      dragging.current = false;
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    e.preventDefault();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const d = dist(a, b);
      const next = clamp(Math.round((pinchRef.current.scale * d) / pinchRef.current.distance), 50, 300);
      setPos(p => ({ ...p, scale: next }));
      return;
    }

    if (!dragging.current) return;
    const dx = ((e.clientX - startRef.current.cx) / cropSize.w) * 100;
    const dy = ((e.clientY - startRef.current.cy) / cropSize.h) * 100;
    const nx = clamp(Math.round(startRef.current.px - dx), 0, 100);
    const ny = clamp(Math.round(startRef.current.py - dy), 0, 100);
    setPos(p => ({ ...p, x: nx, y: ny }));
  }, [cropSize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 1) {
      const [rem] = Array.from(pointersRef.current.values());
      startRef.current = { cx: rem.x, cy: rem.y, px: posRef.current.x, py: posRef.current.y };
      dragging.current = true;
    } else {
      dragging.current = false;
    }
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setPos(p => ({ ...p, scale: clamp(p.scale + delta, 50, 300) }));
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 z-10">
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 gap-1.5" onClick={onCancel}>
          <X className="w-4 h-4" /> Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 gap-1" onClick={() => setPos(DEFAULT_POS)}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={() => onConfirm(pos)}>
            <Check className="w-4 h-4" /> Apply
          </Button>
        </div>
      </div>

      {/* Crop area */}
      <div
        ref={overlayRef}
        className="relative select-none cursor-grab active:cursor-grabbing touch-none overscroll-none"
        style={{ width: cropSize.w, height: cropSize.h }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Image behind crop */}
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <img
            src={src}
            alt="Crop preview"
            className="w-full h-full pointer-events-none"
            draggable={false}
            style={{
              objectFit: "cover",
              objectPosition: `${pos.x}% ${pos.y}%`,
              transform: `scale(${pos.scale / 100})`,
              transformOrigin: `${pos.x}% ${pos.y}%`,
            }}
          />
        </div>

        {/* Dashed crop border */}
        <div className="absolute inset-0 border-2 border-dashed border-white/70 rounded-lg pointer-events-none" />

        {/* Corner markers */}
        {[["top-0 left-0", "border-t-2 border-l-2 rounded-tl-lg"],
          ["top-0 right-0", "border-t-2 border-r-2 rounded-tr-lg"],
          ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl-lg"],
          ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br-lg"],
        ].map(([pos, border], i) => (
          <div key={i} className={cn("absolute w-4 h-4 border-white pointer-events-none", pos, border)} />
        ))}

        {/* Dim outside area — simulated with shadow overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          borderRadius: "8px",
        }} />
      </div>

      {/* Bottom info bar */}
      <div className="mt-4 flex flex-col items-center gap-2">
        {/* Dimension labels */}
        <div className="flex items-center gap-4 text-[11px] text-white/70 font-mono">
          {imgNatural.w > 0 && (
            <span>Original: {imgNatural.w}×{imgNatural.h}</span>
          )}
          <span className="text-white/50">→</span>
          <span>Display: {cropSize.w}×{cropSize.h}</span>
        </div>
        {cropLabel && (
          <span className="text-[10px] text-white/50">{cropLabel}</span>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-3 mt-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10"
            onClick={() => setPos(p => ({ ...p, scale: clamp(p.scale - 10, 50, 300) }))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white font-mono w-12 text-center">{pos.scale}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10"
            onClick={() => setPos(p => ({ ...p, scale: clamp(p.scale + 10, 50, 300) }))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <span className="text-[10px] text-white/40 mt-1">Drag to reposition • Scroll or pinch to zoom</span>
      </div>
    </div>
  );
}
