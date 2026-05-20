/**
 * Live (public) renderer that mirrors the freeform editor canvas:
 * fixed 1440px design width scaled responsively to its container,
 * with page-level background, sections, and per-block absolute
 * positioning + rotation honored.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BlockRenderer } from "./BlockRenderer";
import type { PageBlock } from "./types";
import {
  backgroundToCss,
  DEFAULT_CANVAS_SETTINGS,
  DEVICE_SIZES,
  readLayout,
  type CanvasSection,
  type CanvasSettings,
} from "./canvas/types";

interface Props {
  blocks: PageBlock[];
  settings: CanvasSettings;
  persona?: any;
  trackInteraction?: (type: string, metadata: any) => void;
}

export function FreeformLiveCanvas({ blocks, settings, persona, trackInteraction }: Props) {
  const s = { ...DEFAULT_CANVAS_SETTINGS, ...(settings || {}) };
  const sections: CanvasSection[] = s.sections?.length ? s.sections : DEFAULT_CANVAS_SETTINGS.sections;
  const canvasW = DEVICE_SIZES.desktop.w;
  const canvasH = sections.reduce((sum, sec) => sum + sec.height, 0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / canvasW));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasW]);

  const ordered = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div ref={wrapRef} className="w-full" style={{ height: canvasH * scale }}>
      <div
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {/* Page background */}
        <div className="absolute inset-0 pointer-events-none" style={backgroundToCss(s.background)} />
        {/* Sections (per-section bg only — no editor chrome) */}
        {(() => {
          let y = 0;
          return sections.map((sec) => {
            const top = y;
            y += sec.height;
            if (!sec.bg) return null;
            return (
              <div
                key={sec.id}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top, height: sec.height, ...backgroundToCss(sec.bg) }}
              />
            );
          });
        })()}
        {/* Blocks */}
        {ordered.map((b) => {
          const layout = readLayout(b.styles);
          if (!layout) return null;
          return (
            <div
              key={b.id}
              data-block-id={b.id}
              className="absolute"
              style={{
                left: layout.x,
                top: layout.y,
                width: layout.w,
                height: layout.h,
                transform: layout.rotate ? `rotate(${layout.rotate}deg)` : undefined,
                transformOrigin: "center",
              }}
            >
              <BlockRenderer block={b} persona={persona} onTrackInteraction={trackInteraction} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
