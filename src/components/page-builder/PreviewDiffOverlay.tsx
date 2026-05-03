/**
 * Dev-only runtime overlay that renders the editor canvas and the live public
 * page side-by-side and highlights bounding-box mismatches per block.
 *
 * Only renders in development (import.meta.env.DEV). Triggered by the
 * "Compare" button in the Page Builder toolbar.
 */
import { useEffect, useRef, useState } from "react";
import { X, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Public URL of the live page to load in the right pane. */
  liveUrl: string;
}

interface DiffRow {
  blockId: string;
  editorRect: { w: number; h: number } | null;
  liveRect: { w: number; h: number } | null;
  delta: number; // max abs diff in px (width or height)
}

const TOLERANCE_PX = 2;

export function PreviewDiffOverlay({ open, onClose, liveUrl }: Props) {
  const liveFrameRef = useRef<HTMLIFrameElement>(null);
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [loading, setLoading] = useState(false);

  const measure = () => {
    setLoading(true);
    // Editor measurements
    const editorRoot = document.querySelector('[data-page-canvas="editor"]');
    const editorRects = new Map<string, { w: number; h: number }>();
    editorRoot?.querySelectorAll<HTMLElement>("[data-block-id]").forEach((el) => {
      const r = el.getBoundingClientRect();
      editorRects.set(el.dataset.blockId!, { w: r.width, h: r.height });
    });

    // Live measurements (cross-origin safe: same origin since same dev server)
    const liveDoc = liveFrameRef.current?.contentDocument;
    const liveRects = new Map<string, { w: number; h: number }>();
    liveDoc?.querySelectorAll<HTMLElement>("[data-block-id]").forEach((el) => {
      const r = el.getBoundingClientRect();
      liveRects.set(el.dataset.blockId!, { w: r.width, h: r.height });
    });

    const ids = new Set([...editorRects.keys(), ...liveRects.keys()]);
    const next: DiffRow[] = [];
    ids.forEach((id) => {
      const e = editorRects.get(id) ?? null;
      const l = liveRects.get(id) ?? null;
      const delta = e && l ? Math.max(Math.abs(e.w - l.w), Math.abs(e.h - l.h)) : Infinity;
      next.push({ blockId: id, editorRect: e, liveRect: l, delta });
    });
    next.sort((a, b) => b.delta - a.delta);
    setRows(next);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(measure, 800);
    return () => clearTimeout(t);
  }, [open, liveUrl]);

  if (!open) return null;

  const mismatches = rows.filter((r) => r.delta > TOLERANCE_PX);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      <header className="h-12 flex items-center gap-3 px-4 border-b border-border bg-card/80">
        <span className="text-sm font-display font-semibold">Editor ↔ Live Diff</span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full flex items-center gap-1",
            mismatches.length > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-500",
          )}
        >
          {mismatches.length > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {mismatches.length > 0
            ? `${mismatches.length} mismatch${mismatches.length === 1 ? "" : "es"}`
            : "All blocks match"}
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-7" onClick={measure} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} />
          Re-measure
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        <div className="border-r border-border flex flex-col min-h-0">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/30">
            Live page
          </div>
          <iframe
            ref={liveFrameRef}
            src={liveUrl}
            title="live"
            className="flex-1 w-full bg-background"
            onLoad={measure}
          />
        </div>

        <div className="flex flex-col min-h-0 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/30 sticky top-0 z-10">
            Per-block deltas (tolerance ±{TOLERANCE_PX}px)
          </div>
          <div className="p-3 space-y-1.5">
            {rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No blocks measured yet.</p>
            )}
            {rows.map((r) => {
              const ok = r.delta <= TOLERANCE_PX;
              return (
                <div
                  key={r.blockId}
                  className={cn(
                    "p-2 rounded-md border text-[11px] font-mono",
                    ok
                      ? "border-border/40 bg-muted/20"
                      : "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{r.blockId.slice(0, 8)}…</span>
                    <span className={cn(ok ? "text-emerald-500" : "text-destructive")}>
                      Δ {Number.isFinite(r.delta) ? `${r.delta.toFixed(1)}px` : "missing"}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    editor: {r.editorRect ? `${r.editorRect.w.toFixed(0)}×${r.editorRect.h.toFixed(0)}` : "—"} ·
                    live: {r.liveRect ? `${r.liveRect.w.toFixed(0)}×${r.liveRect.h.toFixed(0)}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
