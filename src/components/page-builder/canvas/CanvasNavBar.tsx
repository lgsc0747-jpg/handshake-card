import { Hand, MousePointer2, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Zap, ZapOff, Magnet, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Props {
  scale: number;
  panTool: boolean;
  setPanTool: (v: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  dragPreview?: "live" | "endpoint";
  setDragPreview?: (v: "live" | "endpoint") => void;
  smartSnap?: boolean;
  setSmartSnap?: (v: boolean) => void;
  snapTolerance?: number;
  setSnapTolerance?: (v: number) => void;
  snapMode?: "edges" | "edges-centers";
  setSnapMode?: (v: "edges" | "edges-centers") => void;
  snapDebug?: boolean;
  setSnapDebug?: (v: boolean) => void;
}

const Btn = ({ active, onClick, title, children }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
    )}
  >
    {children}
  </button>
);

export function CanvasNavBar({
  scale, panTool, setPanTool,
  zoomIn, zoomOut, fit, onUndo, onRedo,
  dragPreview, setDragPreview,
  smartSnap, setSmartSnap, snapTolerance, setSnapTolerance,
  snapMode, setSnapMode, snapDebug, setSnapDebug,
}: Props) {
  const hasSnapControls = setSmartSnap || setSnapTolerance || setSnapMode || setSnapDebug;
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl">
      <Btn active={!panTool} onClick={() => setPanTool(false)} title="Select (V)">
        <MousePointer2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn active={panTool} onClick={() => setPanTool(!panTool)} title="Hand / pan (Space)">
        <Hand className="w-3.5 h-3.5" />
      </Btn>
      <div className="w-px h-4 bg-border/60 mx-0.5" />
      <Btn onClick={zoomOut} title="Zoom out (⌘-)">
        <ZoomOut className="w-3.5 h-3.5" />
      </Btn>
      <button
        onClick={fit}
        className="px-2 h-7 rounded-md text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors min-w-12"
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

      {setDragPreview && (
        <>
          <div className="w-px h-4 bg-border/60 mx-0.5" />
          <Btn
            active={dragPreview === "endpoint"}
            onClick={() => setDragPreview(dragPreview === "endpoint" ? "live" : "endpoint")}
            title={dragPreview === "endpoint" ? "Drag preview: endpoint only" : "Drag preview: live motion"}
          >
            {dragPreview === "endpoint" ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </Btn>
        </>
      )}

      {hasSnapControls && (
        <>
          <div className="w-px h-4 bg-border/60 mx-0.5" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                title="Smart snap settings"
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                  smartSnap
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                <Magnet className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-64 p-3 space-y-3">
              {setSmartSnap && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Smart snap</Label>
                  <Switch checked={!!smartSnap} onCheckedChange={setSmartSnap} />
                </div>
              )}
              {setSnapTolerance && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tolerance</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">{snapTolerance ?? 6}px</span>
                  </div>
                  <Slider
                    min={1}
                    max={24}
                    step={1}
                    value={[snapTolerance ?? 6]}
                    onValueChange={(v) => setSnapTolerance(v[0])}
                  />
                </div>
              )}
              {setSnapMode && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Snap to</Label>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <button
                      onClick={() => setSnapMode("edges")}
                      className={cn(
                        "px-2 py-1 rounded-md border transition-colors",
                        snapMode === "edges"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Edges
                    </button>
                    <button
                      onClick={() => setSnapMode("edges-centers")}
                      className={cn(
                        "px-2 py-1 rounded-md border transition-colors",
                        (snapMode ?? "edges-centers") === "edges-centers"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Edges + centers
                    </button>
                  </div>
                </div>
              )}
              {setSnapDebug && (
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Bug className="w-3 h-3" /> Snap debug overlay
                  </Label>
                  <Switch checked={!!snapDebug} onCheckedChange={setSnapDebug} />
                </div>
              )}
            </PopoverContent>
          </Popover>
        </>
      )}

      {(onUndo || onRedo) && <div className="w-px h-4 bg-border/60 mx-0.5" />}
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
