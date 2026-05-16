import { Hand, MousePointer2, ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  scale: number;
  panTool: boolean;
  setPanTool: (v: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const Btn = ({ active, onClick, title, children }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
      active
        ? "bg-blue-500 text-white"
        : "text-zinc-400 hover:text-white hover:bg-white/10",
    )}
  >
    {children}
  </button>
);

export function CanvasNavBar({
  scale, panTool, setPanTool,
  zoomIn, zoomOut, fit, onUndo, onRedo,
}: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-2xl">
      <Btn active={!panTool} onClick={() => setPanTool(false)} title="Select (V)">
        <MousePointer2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={panTool} onClick={() => setPanTool(!panTool)} title="Hand / pan (Space)">
        <Hand className="w-3.5 h-3.5" />
      </Btn>
      <div className="w-px h-4 bg-white/10 mx-0.5" />
      <Btn onClick={zoomOut} title="Zoom out (⌘-)">
        <ZoomOut className="w-3.5 h-3.5" />
      </Btn>
      <button
        onClick={fit}
        className="px-2 h-7 rounded-md text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-white/10 transition-colors min-w-12"
        title="Fit to screen (⌘0)"
      >
        {Math.round(scale * 100)}%
      </button>
      <Btn onClick={zoomIn} title="Zoom in (⌘+)">
        <ZoomIn className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={fit} title="Fit to screen">
        <Maximize className="w-3.5 h-3.5" />
      </Btn>
      {(onUndo || onRedo) && <div className="w-px h-4 bg-white/10 mx-0.5" />}
      {onUndo && (
        <Btn onClick={onUndo} title="Undo (⌘Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </Btn>
      )}
      {onRedo && (
        <Btn onClick={onRedo} title="Redo (⌘⇧Z)">
          <Redo2 className="w-3.5 h-3.5" />
        </Btn>
      )}
    </div>
  );
}
