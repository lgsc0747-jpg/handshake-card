---
name: Page Transitions
description: Global blur + zoom-in transition on every route change, overrides local fade-ins
type: design
---
All routes are wrapped in `<PageTransition>` (src/components/PageTransition.tsx) using framer-motion AnimatePresence keyed on `location.pathname`. Effect: opacity 0→1, scale 0.94→1, filter blur(14px)→0; exit scale 1.02 + blur(8px). Duration 0.42s, ease [0.22, 1, 0.36, 1]. Do not add per-page fade-in animations — this global transition replaces them.
