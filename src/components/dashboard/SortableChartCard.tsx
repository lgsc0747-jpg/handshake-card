import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minimize2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface SortableChartCardProps {
  id: string;
  children: React.ReactNode;
  editMode?: boolean;
  className?: string;
}

const LS_KEY = "nfc_chart_sizes";
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

function loadSizes(): Record<string, { w: number; h: number }> {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function saveSizes(sizes: Record<string, { w: number; h: number }>) {
  localStorage.setItem(LS_KEY, JSON.stringify(sizes));
}

export function resetChartSizes() {
  localStorage.removeItem(LS_KEY);
}

export function SortableChartCard({ id, children, className }: SortableChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [customSize, setCustomSize] = useState<{ w: number | null; h: number | null }>(() => {
    const sizes = loadSizes();
    return { w: sizes[id]?.w || null, h: sizes[id]?.h || null };
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rect = cardRef.current?.getBoundingClientRect();
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      startW: rect?.width ?? 300,
      startH: rect?.height ?? 200,
    };
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const diffX = clientX - resizeRef.current.startX;
      const diffY = clientY - resizeRef.current.startY;
      const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeRef.current.startW + diffX));
      const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeRef.current.startH + diffY));
      setCustomSize({ w: newW, h: newH });
    };
    const handleEnd = () => {
      setIsResizing(false);
      const sizes = loadSizes();
      sizes[id] = { w: customSize.w ?? 0, h: customSize.h ?? 0 };
      saveSizes(sizes);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isResizing, customSize, id]);

  const resetSize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomSize({ w: null, h: null });
    const sizes = loadSizes();
    delete sizes[id];
    saveSizes(sizes);
  }, [id]);

  const hasCustom = customSize.w !== null || customSize.h !== null;

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${className ?? ""}`}>
      <div
        ref={cardRef}
        style={{
          ...(customSize.w ? { width: customSize.w, maxWidth: MAX_WIDTH } : {}),
          ...(customSize.h ? { height: customSize.h, maxHeight: MAX_HEIGHT, overflow: "auto" } : {}),
        }}
      >
        <div {...attributes} {...listeners} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none z-10 flex items-center gap-1">
          {hasCustom && (
            <button onClick={resetSize} className="p-0.5 hover:text-primary transition-colors" title="Reset size">
              <Minimize2 className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
        {children}
      </div>
      {/* Corner resize handle — bottom-right */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-end justify-end"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground/50">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
