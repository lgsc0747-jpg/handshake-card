import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

/**
 * Global page transition: blur + zoom-in on route change.
 * Overrides any local fade-in animations.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.94, filter: "blur(14px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: "100vh", willChange: "transform, filter, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
