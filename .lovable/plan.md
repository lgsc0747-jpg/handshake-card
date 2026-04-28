# Framer-Style Page Builder — Phased Rebuild Plan

> Target: rebuild the Page Builder as a free-form Framer-like canvas while keeping
> all data in the existing Supabase project. Estimated 4–6 weeks across 5 phases.
> Ship behind a `prefs.flagFramerBuilder` feature flag so the legacy block-based
> editor stays available during rollout.

---

## Phase 0 — Foundation (week 1)

**Goal:** new schema + minimal canvas shell, no editing tools yet.

### Database

```sql
-- Each "frame" is a free-form artboard (== a page in classic terms).
create table public.canvas_frames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  persona_id uuid not null,
  name text not null default 'Untitled',
  slug text not null default 'untitled',
  is_homepage boolean not null default false,
  is_visible boolean not null default true,
  -- Canvas dimensions per breakpoint
  breakpoints jsonb not null default
    '{"desktop":{"w":1200,"h":2000},"tablet":{"w":768,"h":2000},"mobile":{"w":390,"h":2000}}',
  -- Global frame styles (bg color, fonts loaded, scroll behavior)
  styles jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each node = one positioned element on the canvas. Tree via parent_id.
create table public.canvas_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  frame_id uuid not null references public.canvas_frames(id) on delete cascade,
  parent_id uuid references public.canvas_nodes(id) on delete cascade,
  -- Element type discriminator: text, image, shape, frame, button, video,
  -- form, gallery, embed, persona-card, vcard-button, link, lottie, code
  node_type text not null,
  -- Free-form positioning per breakpoint:
  --   { desktop: {x,y,w,h,rotate,opacity,zIndex,layout:'absolute'|'flex'},
  --     tablet:  {...overrides...},
  --     mobile:  {...overrides...} }
  layout jsonb not null default '{}',
  -- Visual styles per breakpoint (color, bg, blur, shadow, gradient, border)
  styles jsonb not null default '{}',
  -- Type-specific props (text content, image src, button href, etc.)
  props jsonb not null default '{}',
  -- Interaction states & animations: hover/press/scroll/intersect triggers
  interactions jsonb not null default '[]',
  sort_order integer not null default 0,
  is_locked boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index canvas_nodes_frame_idx on public.canvas_nodes(frame_id, sort_order);
create index canvas_nodes_parent_idx on public.canvas_nodes(parent_id);
create index canvas_frames_persona_idx on public.canvas_frames(persona_id);

-- RLS: owners full access; public read for visible frames/nodes of active personas
alter table public.canvas_frames enable row level security;
alter table public.canvas_nodes enable row level security;

create policy "Owners manage frames" on public.canvas_frames
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public read visible frames of active personas" on public.canvas_frames
  for select using (is_visible and exists (
    select 1 from public.personas p
    where p.id = canvas_frames.persona_id and p.is_active = true and p.is_private = false
  ));

create policy "Owners manage nodes" on public.canvas_nodes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public read visible nodes" on public.canvas_nodes
  for select using (is_visible and exists (
    select 1 from public.canvas_frames f
    where f.id = canvas_nodes.frame_id and f.is_visible
  ));

-- Reusable design tokens (per user) — mirrors Framer's "Tokens" panel
create table public.canvas_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_type text not null,            -- 'color' | 'font' | 'spacing' | 'shadow' | 'radius'
  name text not null,
  value jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.canvas_tokens enable row level security;
create policy "Owners manage tokens" on public.canvas_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reusable components — saved node-trees the user can drop on any frame
create table public.canvas_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  thumbnail_url text,
  tree jsonb not null,                 -- serialized {root, children[]}
  variants jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.canvas_components enable row level security;
create policy "Owners manage components" on public.canvas_components for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Frontend

- New route `/builder/:personaId/:frameId?` (separate from `/page-builder`).
- `CanvasShell` — full-screen, three-column: left tree, center canvas, right inspector.
- Pan/zoom via `react-zoom-pan-pinch` or hand-rolled wheel/touch handlers.
- Renders nodes via a single `<NodeRenderer>` that reads `layout.absolute` and styles.
- No editing yet — read-only.

### Feature flag

- Add `prefs.flagFramerBuilder?: boolean` to `PrefsBlob`.
- `/page-builder` redirects to `/builder/...` when flag is on, else loads legacy.

---

## Phase 1 — Selection, transform, drag-resize (week 2)

- Click-to-select with marching-ants outline.
- 8-handle resize, rotation handle, snap-to-pixel/grid/peer guides.
- Multi-select (shift-click, marquee).
- Keyboard: arrows nudge 1px (10px with shift), backspace delete, ⌘D duplicate.
- Drag-from-elsewhere onto canvas spawns a node at drop coords.
- Live "smart guides" overlay drawing alignment lines like Figma.

State model:
- Use `zustand` with `immer` for undo/redo. Snapshot per drag-end (not per pointermove).
- 50-step history (matches existing builder).

Persistence:
- Debounced upserts to `canvas_nodes` (300ms after last change), batched per frame.
- Optimistic UI; rollback on error toast.

---

## Phase 2 — Element library (week 3)

Ship these node_types with full property panels:

| Type | Inspector controls |
|---|---|
| `text` | font family, weight, size, line-height, color, alignment, gradient text, link |
| `image` | src (uses existing `design-assets` bucket + cropper), object-fit, radius, filters |
| `shape` | preset (rect/ellipse/triangle), fill (solid/gradient), border, shadow |
| `frame` | container with `layout: 'absolute' \| 'flex' \| 'grid'`, padding, gap |
| `button` | label, action (link / persona vcard / scroll-to / open modal), variants |
| `video` | src (storage upload or YouTube/Vimeo embed), autoplay, controls, poster |
| `form` | leverages existing `insert_lead_capture` RPC — drops a fully wired form |
| `gallery` | multi-image carousel, layouts: grid / masonry / slider |
| `embed` | iframe with allowlist (YouTube, Spotify, Calendly, Maps) |
| `persona-card` | renders the live 3D card from `InteractiveCard3D` |
| `vcard-button` | one-tap vCard download bound to current persona |
| `code` | sanitized HTML/CSS only, no JS execution (prevents XSS) |

Asset pipeline reuses the existing `ImageUploadField` + `ImageCropperModal`.

---

## Phase 3 — Responsiveness & breakpoints (week 4)

- Three breakpoints (desktop / tablet / mobile), switchable in toolbar.
- Per-breakpoint overrides stored in `layout.{tablet|mobile}` and `styles.{tablet|mobile}`.
- Inheritance: smaller breakpoints inherit from desktop unless explicitly overridden.
- "Override" badge in inspector when a property differs from desktop.
- Per-breakpoint visibility toggles (hide on mobile, etc.).

Public renderer:
- `BuilderRuntime` resolves the active breakpoint via `window.matchMedia` and merges
  layout/styles. Server-rendered fallback for SEO uses desktop layout.

---

## Phase 4 — Interactions, animations, components (week 5)

Interactions (stored in `node.interactions`):
- Triggers: `hover`, `press`, `appear`, `scroll-into-view`, `click`, `time-delay`.
- Effects: opacity, transform (move/scale/rotate), color, navigate, scroll-to-frame.
- Eased with framer-motion under the hood.

Components:
- "Save as component" right-click on any node → writes to `canvas_components.tree`.
- Drop a component on any frame; instances stay linked. Edit master → all update.
- Variants: name + override map (e.g. "primary"/"secondary" buttons).

Tokens:
- Color/font/shadow/spacing tokens from `canvas_tokens`.
- Inspector color picker shows token swatches first; "create token from this color"
  button promotes a one-off color to a reusable token.

---

## Phase 5 — Publish, SEO, runtime (week 6)

Public rendering path (`PublicProfilePage` for `page_mode = 'builder'`):
- Fetch `canvas_frames` + `canvas_nodes` (homepage first, then per-slug).
- Render via shared `BuilderRuntime` component.
- Generate `<title>`, `<meta description>`, `<link canonical>` from frame metadata.
- Lazy-load images (existing `loading="lazy"`), preload above-the-fold hero image.
- Hydrate interactions only after first paint (defer framer-motion).

Edge function: `publish-frame` (optional, for caching):
- On publish, snapshot tree to a `canvas_publishes` table (immutable history).
- Public renderer reads from latest published snapshot, not draft.

Migration from legacy:
- One-shot script: read `site_pages` + `page_blocks`, generate equivalent
  `canvas_frames` + `canvas_nodes` with sensible default positions.
- Preserves user data; flag off → still loads legacy editor for un-migrated personas.

---

## Cross-cutting concerns

- **Performance:** virtualize the node tree panel; throttle pan/zoom; offload heavy
  rendering (large galleries) to `IntersectionObserver` lazy mounts.
- **Mobile editor:** desktop-only initially. Mobile users see "Edit on desktop"
  message. Future Phase 6 = touch-first editor.
- **A11y:** focus trap inside inspector; published pages must include landmark
  roles even when authored as free-form (auto-tag first frame as `<main>`).
- **Cost guardrails:** debounce all writes; cap nodes/frame at 500; soft-warn at 300.
- **Testing:** snapshot the runtime renderer per phase against fixture trees.

---

## Open decisions for the user

1. Migration mode: auto-convert all personas at flag-on, or opt-in per persona?
2. Free vs Pro gating: free-form canvas could be Handshake+ only.
3. Custom code blocks: allow JS (`<script>` sandbox) or HTML/CSS only?
4. Component marketplace: per-user only, or share components across all Handshake users?

These will set scope for Phase 5.
