## Page Builder — Freeform Canvas Revamp

Move the page builder from a strictly vertical, sortable list to a **canvas-based editor** where blocks can be positioned, sized, and selected like in Figma/Canva — while preserving the existing block types, theming, and live render contract.

---

### 1. New layout model per block

Extend `page_blocks` (and the in-app `PageBlock` type) with optional layout fields stored in `styles.layout`:

```ts
styles.layout = {
  mode: "stack" | "grid" | "free",   // per-page setting; mirrored on each block for safety
  x: number, y: number,              // px from canvas top-left (free + grid)
  w: number, h: number,              // px width/height (auto if undefined)
  col?: number, row?: number,        // grid cell anchor (grid mode)
  colSpan?: number, rowSpan?: number
}
```

A new `site_pages.layout_mode` column (`stack` default) controls which mode the canvas renders in. Existing pages stay in `stack` mode → zero regressions.

### 2. Three canvas modes

- **Smart grid** — auto 12-col responsive grid, blocks snap to columns/rows. Good default for marketing pages.
- **Linear grid** — user defines columns + row height (e.g. 8 cols × 80 px). Blocks snap to that grid; visible guides.
- **Freeform** — absolute positioning, no snap. Imaginary margin guides shown as faint dashed lines (configurable: e.g. 24 px from each edge of the canvas).

Mode picker lives in the top toolbar next to Desktop/Mobile preview toggles.

### 3. Marquee multi-select

- Click-drag on empty canvas area draws a translucent selection rectangle.
- Any block whose bounding box intersects gets selected.
- Shift-click adds/removes individual blocks.
- Multi-select supports: move together, delete, duplicate, align (left/center/right), distribute, group visibility toggle.

### 4. Resize + move transform

When a block is selected, render 8 resize handles + a move cursor on hover:
- Corner handles: proportional resize (Shift = freeform).
- Edge handles: width-only or height-only.
- Drag the block body to move.
- Snap to grid in grid modes; snap to margin guides + sibling edges in freeform (with magenta alignment guides like Figma).
- Min size enforced per block type (e.g. button min 80×32).

### 5. Margin & guide system

Per-page settings:
- Canvas padding (top/right/bottom/left) → rendered as dashed inset rectangle.
- Optional column guides count + gutter.
- Toggle "Show guides" in toolbar.

Guides are visual-only; they don't constrain placement in freeform but do attract snap.

### 6. Architecture

New files:
- `src/components/page-builder/canvas/FreeformCanvas.tsx` — renders blocks absolutely; owns marquee, drag, resize.
- `src/components/page-builder/canvas/MarqueeSelection.tsx` — pointer-driven rectangle.
- `src/components/page-builder/canvas/BlockFrame.tsx` — wraps a `BlockRenderer` with selection chrome + 8 handles.
- `src/components/page-builder/canvas/GuideOverlay.tsx` — margin + column guides.
- `src/components/page-builder/canvas/useCanvasSelection.ts` — selection state + keyboard (arrows nudge, ⌫ delete, ⌘D duplicate, ⌘A select all).
- `src/components/page-builder/canvas/snap.ts` — snap math for grid/freeform.

`PageBuilderPage.tsx` swaps the existing sortable list for `FreeformCanvas` when `layout_mode !== "stack"`. **Stack mode is preserved** as the legacy / mobile-friendly editor.

### 7. Public render parity

`BlockRenderer` is wrapped on `/p/:username` with the same absolute layout when `layout_mode !== "stack"`, so what you build is what visitors see. Mobile breakpoint auto-collapses freeform → stack (sorted by `y` then `x`) so phones never get a broken layout.

### 8. Database migration

```sql
ALTER TABLE site_pages ADD COLUMN layout_mode text NOT NULL DEFAULT 'stack'
  CHECK (layout_mode IN ('stack','grid','free'));
ALTER TABLE site_pages ADD COLUMN canvas_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
-- canvas_settings: { padding:{t,r,b,l}, columns, gutter, rowHeight, showGuides }
```

No changes to `page_blocks` schema — layout lives inside the existing `styles` jsonb.

### 9. Out of scope (this pass)

- Block grouping / frames-within-frames
- Z-index reordering UI (auto by sort_order, with bring-to-front shortcut)
- Animation timeline

---

### Build order

1. Migration + types + `layout_mode` toolbar toggle (stack stays default).
2. `FreeformCanvas` skeleton with absolute block positioning + persisted x/y/w/h.
3. `BlockFrame` with selection + 8-handle resize + drag move.
4. Marquee multi-select + multi-block move/delete/duplicate.
5. Smart grid + linear grid snap; guide overlay with margin reference lines.
6. Public render parity + mobile fallback.
7. Polish: alignment guides, keyboard shortcuts, undo/redo integration.