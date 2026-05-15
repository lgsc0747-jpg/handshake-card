## Page Builder Canvas & Interaction Overhaul

A focused rebuild of the canvas editing model: per-page persistence, multi-select alignment, viewport-true sizing, right-click menus, inline text editing, and a leaner block settings panel.

---

### 1. Per-page canvas settings persistence

`site_pages.canvas_settings` already exists as `jsonb`. Expand the saved shape to:

```ts
{
  snap: boolean,        // snap-to-grid on/off
  columns: number,      // column count
  showColumns: boolean, // column guide visibility
  showGuides: boolean,  // center + edge guide visibility
  gutter: number,
  rowHeight: number,
  // padding fields removed (see section 3)
}
```

- Loaded from `site_pages` on page open, written on toolbar toggle / column change with debounce.
- A small `useCanvasSettings(pageId)` hook owns the read/write so all canvas surfaces share it.
- No DB migration required — the column already exists; we just stop writing `paddingT/R/B/L`.

### 2. Multi-block alignment & distribution

New `SelectionToolbar` floating above the bounding box of the multi-selection. Buttons:

- Align: Left / Center-H / Right / Top / Middle-V / Bottom
- Distribute: Horizontal / Vertical (requires 3+ selected)

Alignment math runs against the union bounding box of the selection. Distribution sorts by axis position then equalizes gaps. Single-select hides the toolbar. All ops commit in one history step.

New file: `src/components/page-builder/canvas/SelectionToolbar.tsx`
New file: `src/components/page-builder/canvas/align.ts` (pure functions)

### 3. Remove margins, add center guide lines

- Drop `paddingT/R/B/L` from `CanvasSettings` defaults and `GuideOverlay`.
- `GuideOverlay` renders:
  - Vertical + horizontal center lines spanning the full canvas
  - Optional column lines (when `showColumns`)
- New "out-of-bounds" indicator: when any block's bounding box exits the canvas width, the offending edge gets a red dashed stroke on `BlockFrame` until the block is moved back inside.

### 4. True viewport canvas sizing

The canvas inner width follows the preview device:

| Device  | Canvas size       |
|---------|-------------------|
| Desktop | 1920 × 1080 (min) |
| Tablet  | 820 × 1180        |
| Phone   | 390 × 844         |

- `PageBuilderPage` already has a desktop/mobile toggle — extend to a 3-way switch (Desktop / Tablet / Phone).
- Canvas wrapper renders at the exact pixel width and scales down with CSS `transform: scale()` to fit the available editor area, preserving 1:1 coordinate math.
- Public render (`PublicProfilePage`) keeps its responsive collapse behavior (mobile → stack).

### 5. Slim block settings panel

Remove from `BlockEditor.tsx`:
- Spacing / padding / margin inputs
- Max-width selector
- Manual alignment toggles
- Per-block style overrides that overlap with canvas position

Keep only **content fields** (text, image URL, link, list items, etc.). Position, size, and alignment now live exclusively on the canvas via drag/resize + the new selection toolbar.

### 6. Right-click context menu

New `BlockContextMenu` (radix `ContextMenu`) wrapped around each `BlockFrame`:

- Bring Forward / Send Backward / Bring to Front / Send to Back  → updates `sort_order` (z-index = sort_order in absolute mode)
- Duplicate (⌘D)
- Delete (⌫)
- Copy (⌘C) / Paste (⌘V) — uses an in-memory `clipboardRef` (no system clipboard needed); paste places the block at cursor + 16px offset

Layering controls live **only** in this menu. Top toolbar keeps Delete/Duplicate as quick actions.

### 7. Canvas-first inline text editing

For text-bearing blocks (`heading`, `text`, `quote`, `button`):

- `BlockFrame` becomes `pointer-events: auto` on its content layer when the block is the sole selection and the user double-clicks.
- Switches to a `contentEditable` overlay matching the block's typography.
- Native cursor placement, drag-to-select, type-to-replace.
- `Esc` or click-outside commits the change to `block.content.text` (or block-specific field) and exits edit mode.
- The `BlockEditor` settings panel for these blocks loses its text input — only style/link fields remain.

New file: `src/components/page-builder/canvas/InlineTextEditor.tsx`
Updates to `BlockRenderer` to accept `editingText` mode and render the editable surface for the supported block types.

---

### Files touched

**New**
- `src/components/page-builder/canvas/SelectionToolbar.tsx`
- `src/components/page-builder/canvas/BlockContextMenu.tsx`
- `src/components/page-builder/canvas/InlineTextEditor.tsx`
- `src/components/page-builder/canvas/align.ts`
- `src/components/page-builder/canvas/useCanvasSettings.ts`
- `src/components/page-builder/canvas/useBlockClipboard.ts`

**Edited**
- `src/components/page-builder/canvas/types.ts` — drop padding, add `showColumns`/`snap` flags
- `src/components/page-builder/canvas/GuideOverlay.tsx` — center lines, no margin rect
- `src/components/page-builder/canvas/FreeformCanvas.tsx` — viewport-true width, scale-to-fit, context menu, inline edit, selection toolbar
- `src/components/page-builder/canvas/BlockFrame.tsx` — out-of-bounds stroke, double-click edit
- `src/components/page-builder/canvas/snap.ts` — honor `snap` flag, no margin clamping
- `src/components/page-builder/BlockEditor.tsx` — strip layout/spacing/text fields
- `src/components/page-builder/BlockRenderer.tsx` — `editingText` prop
- `src/pages/PageBuilderPage.tsx` — 3-way device toggle, settings hook wiring, top-toolbar buttons
- `src/pages/PublicProfilePage.tsx` — keep current behavior (no margin reads)

**No DB migration** — `canvas_settings` jsonb already exists.

### Out of scope

- System-clipboard paste of arbitrary HTML
- Undo/redo for new ops (will inherit existing history if present, otherwise tracked in a follow-up)
- Tablet/phone-specific block overrides (single coordinate set per block for now)
