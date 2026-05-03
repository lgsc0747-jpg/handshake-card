import * as React from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const MOBILE_MAX = 640;   // < sm
const TABLET_MAX = 1024;  // < lg

function compute(width: number): Breakpoint {
  if (width < MOBILE_MAX) return "mobile";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Three-tier responsive breakpoint hook. Use to opt components into dedicated
 * mobile / tablet / desktop variants (e.g. chart sizing, sidebar collapse,
 * button density) instead of relying solely on Tailwind responsive classes.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>(() =>
    typeof window === "undefined" ? "desktop" : compute(window.innerWidth),
  );
  React.useEffect(() => {
    const onResize = () => setBp(compute(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}

export const isMobile = (bp: Breakpoint) => bp === "mobile";
export const isTablet = (bp: Breakpoint) => bp === "tablet";
export const isDesktop = (bp: Breakpoint) => bp === "desktop";
