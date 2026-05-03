/**
 * Shared layout primitive used by BOTH the Page Builder editor canvas AND the
 * public /p/:username live render. Keeps max-width, horizontal padding, and
 * font/color CSS variable scopes identical so what you see in the editor is
 * what visitors see.
 *
 * If you change tokens here, both surfaces update together.
 */
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tailwind class controlling the maximum content width. */
export const PAGE_CANVAS_MAX_W_CLASS = "max-w-6xl";
/** Horizontal padding applied at every breakpoint. */
export const PAGE_CANVAS_PADDING_X_CLASS = "px-4 sm:px-6";
/** Pixel value matching `max-w-6xl` (Tailwind) — used by JS measurements. */
export const PAGE_CANVAS_MAX_W_PX = 1152;

interface PageCanvasProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Renders inside a phone-frame mock when true (editor only). */
  mobileFrame?: boolean;
  /** Marks this DOM node as the canvas root for the diff overlay. */
  surface?: "editor" | "live";
}

export const PageCanvas = forwardRef<HTMLDivElement, PageCanvasProps>(
  ({ children, className, style, mobileFrame, surface = "live" }, ref) => (
    <div
      ref={ref}
      data-page-canvas={surface}
      className={cn(
        "w-full mx-auto flex flex-col",
        PAGE_CANVAS_MAX_W_CLASS,
        PAGE_CANVAS_PADDING_X_CLASS,
        mobileFrame && "max-w-[375px] px-3",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  ),
);
PageCanvas.displayName = "PageCanvas";
