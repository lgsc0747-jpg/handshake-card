## Page Builder: Figma/Framer-Style Overhaul

A full rebuild of the editor shell around a single scrollable freeform canvas with manual color control, floating contextual toolbars, and pan/zoom navigation.

---

### 1. Remove layout modes
- Drop the Stack / Grid / Free toggle from `PageBuilderPage.tsx`.
- Treat every page as freeform (absolute positioning) — keep `layout_mode` column for back-compat but always render in free mode.
- Delete `useBlockClipboard`/old stack rendering branches in `PublicProfilePage.tsx`. Public render uses absolute coords on desktop, sorted stack on mobile (already behaves that way).

### 2. Remove preset themes — full manual color control
- Strip `PageThemeProvider`, `PAGE_THEMES`, and `PageThemeContext` usage from the builder + public render.
- Replace with per-page + per-block manual color fields stored in JSON:
  - `site_pages.canvas_settings.background`: `{ kind: "solid"|"gradient"|"image", color, gradient: {from,to,angle}, image: {url, fit, position, opacity, blur} }`
  - `site_pages.canvas_settings.accent`: hex (used as default for new buttons/links)
  - `page_blocks.styles.bg`, `.text`, `.borderColor`, `.borderWidth`, `.borderRadius`, `.shadow` (color + blur + spread + opacity)
- Add a `ColorControl` primitive (color + alpha) reused everywhere. Gradient picker + image picker built on top.

### 3. Image / gradient canvas background
- New `CanvasBackgroundPanel` (left sidebar) with: solid/gradient/image tabs, fit (cover/contain/fill/tile), position, opacity slider, blur slider, replace/remove.
- Image source: URL input + drag-drop to a dropzone; uploads go to existing `personas-assets` bucket under `pages/{pageId}/bg-{ts}`.
- `FreeformCanvas` renders the background as an absolutely-positioned layer beneath blocks.

### 4. Relocate & redesign the inspector
- Remove the right-side `BlockEditor` panel.
- Left sidebar becomes a 3-tab rail: **Layers** (block list/reorder), **Insert** (block library), **Page** (canvas bg, accent, sections).
- Selection-driven editing happens through a **floating contextual toolbar** anchored above the bounding box (style, color, border, shadow, layer, delete). Built on `@radix-ui/react-popover` with `floating-ui` style positioning math.
- Content-only fields (image URL, link href, list items, embed code) appear inside an expandable secondary popover from the floating toolbar — never blocks the canvas.

### 5. Canvas navigation controls
- New bottom toolbar `CanvasNavBar`: pan tool toggle, zoom out / % / zoom in, fit-to-screen, undo, redo.
- Spacebar held → temporary pan mode; cursor switches to `grab` / `grabbing`; click-drag pans `scrollTop`/`scrollLeft` of the viewport.
- Zoom range 25% – 400%, multiplies CSS `transform: scale()` on the canvas inner. Coordinates remain 1:1; pointer handlers divide by zoom.
- Undo/redo: lightweight `useCanvasHistory` ring buffer over block layouts + content (max 50 steps), wired to ⌘Z / ⌘⇧Z.

### 6. Selection marquee color
- `FreeformCanvas` marquee rect changes from black/neutral to `bg-blue-500/15 border-blue-500` (`#3b82f6`).

### 7. Perfect bounding box
- `BlockFrame` updated:
  - Outline: `ring-2 ring-blue-500` with white inner ring for contrast.
  - 8 handles (corners + edges) sized in CSS pixels (compensate for zoom so they stay constant on screen).
  - New top-center **rotation handle** (16px circle, 24px above box) → updates `block.styles.layout.rotate` (deg). Render uses `transform: rotate()` around center.
  - Pointer math accounts for rotation when resizing/moving.

### 8. Inline text editing (all text blocks)
- Already exists for heading/text/quote/button via `InlineTextEditor`. Expand to all text-bearing blocks (testimonial quote, faq Q/A, stats labels, team name/role, button label).
- Double-click anywhere on a text block enters edit mode with cursor; `Esc` / click-outside commits.
- Mini floating text toolbar (font family, size, weight, color) appears above the editing element while in edit mode.
- Remove text-content fields from any remaining inspector forms.

### 9. Scrollable canvas + sections
- Canvas is no longer a fixed-height box. New `canvas_settings.sections: Array<{ id, height, bg?: ColorOrImage, label? }>` with at least one default section.
- Total canvas height = sum of section heights. Rendered as stacked full-width section bands inside the scroll viewport.
- "+ Add Section" button at the bottom appends a new 600px section. Drag handle on each section's bottom edge resizes height. Sections reorder via drag handle in the layers panel.
- Dashed divider line between sections shown only in editor (not public).
- Blocks store absolute `y` relative to canvas top; they remain free to overlap sections. Section bg is purely cosmetic.
- Public render: same sectioned background + absolute blocks on desktop; stacks on mobile (sorted by y).

### 10. Responsive device handling
- Top toolbar device toggle stays (Desktop 1440 / Tablet 768 / Phone 375). Switching only changes the canvas inner width; height stays scrollable.
- No per-device block overrides yet (single coordinate set) — same as today; documented as a follow-up.

### 11. Overall UI polish
- Workspace bg → neutral `bg-zinc-900` with `bg-zinc-800` panels, subtle `shadow-lg`, `rounded-xl` panels.
- Floating toolbars: `bg-zinc-900/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl`.
- Smooth `transition-all duration-150` on panel collapses, zoom level changes, selection ring.
- Keep app's existing dark theme tokens; only the page-builder shell gets the Figma-like neutral skin.

---

### Files

**New**
- `src/components/page-builder/canvas/CanvasNavBar.tsx` — pan/zoom/fit/undo/redo
- `src/components/page-builder/canvas/FloatingBlockToolbar.tsx` — selection-anchored style controls
- `src/components/page-builder/canvas/FloatingTextToolbar.tsx` — appears during inline edit
- `src/components/page-builder/canvas/CanvasBackgroundPanel.tsx` — solid/gradient/image
- `src/components/page-builder/canvas/SectionLayer.tsx` — single section band + resize handle
- `src/components/page-builder/canvas/useCanvasHistory.ts` — undo/redo
- `src/components/page-builder/canvas/useCanvasViewport.ts` — zoom, pan, space-hold
- `src/components/page-builder/canvas/ColorControl.tsx` — color + alpha primitive
- `src/components/page-builder/canvas/GradientControl.tsx`
- `src/components/page-builder/sidebar/LeftRail.tsx` — Layers / Insert / Page tabs

**Edited**
- `src/pages/PageBuilderPage.tsx` — new shell layout, drop right panel + layout-mode toggle, mount new toolbars
- `src/components/page-builder/canvas/FreeformCanvas.tsx` — zoom/pan, blue marquee, sections, bg layer
- `src/components/page-builder/canvas/BlockFrame.tsx` — zoom-aware handles, rotation handle, blue ring
- `src/components/page-builder/canvas/InlineTextEditor.tsx` — emit edit-state for mini toolbar
- `src/components/page-builder/BlockRenderer.tsx` — read new style fields (bg/border/shadow/text color), expand inline-edit targets
- `src/components/page-builder/BlockEditor.tsx` — slim down to a fallback popover view (or delete)
- `src/components/page-builder/canvas/types.ts` — new `BackgroundFill`, `SectionDef`, layout rotate
- `src/pages/PublicProfilePage.tsx` — render new canvas bg + sections; remove theme provider usage

**Removed/Deprecated**
- `src/contexts/PageBuilderThemeContext.tsx` — no longer imported by builder/public render (keep file only if still referenced elsewhere; delete if not)
- Stack/Grid branches in canvas + `SelectionToolbar` align/distribute UI moves into the floating block toolbar

**No DB migration required** — all new state fits in existing `jsonb` columns (`canvas_settings`, `page_blocks.styles`).

---

### Out of scope (call out, don't build)
- Per-device block overrides (one coord set per block)
- Multi-block alignment math beyond the existing helpers
- Real text rich-formatting beyond font/size/weight/color (no bold/italic/lists)
- System-clipboard paste of arbitrary HTML
- Side-by-side multi-device preview mode (single-device toggle only for now)
