/**
 * Apple-grade motion presets built on framer-motion.
 *
 * Use these instead of writing one-off `transition` props so spring/easing
 * stays consistent across the app. Mirrors CSS vars in index.css
 * (--ease-ios, --ease-spring, --ease-out-quart).
 */
import type { Transition, Variants } from "framer-motion";

/** iOS-style sheet/dialog spring. Crisp settle, no overshoot. */
export const springIOS: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 0.9,
};

/** Bouncier spring for delightful interactions (FAB, success, drag drop). */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 22,
  mass: 0.8,
};

/** Tween mapped to the iOS easing curve — for opacity/colour transitions. */
export const easeIOS: Transition = {
  type: "tween",
  ease: [0.32, 0.72, 0, 1],
  duration: 0.24,
};

export const easeOutQuart: Transition = {
  type: "tween",
  ease: [0.25, 1, 0.5, 1],
  duration: 0.24,
};

/** Drop-in fade + small lift. Perfect for cards / list items entering. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeOutQuart },
  exit: { opacity: 0, y: 4, transition: { ...easeOutQuart, duration: 0.18 } },
};

/** Stagger helper for lists. Use with parent `animate="animate"` + child variants. */
export const staggerChildren = (delay = 0.04): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: delay, delayChildren: 0.04 } },
});

/** Scale-from-95 for popovers/menus. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: springIOS },
  exit: { opacity: 0, scale: 0.97, transition: { ...easeIOS, duration: 0.14 } },
};
