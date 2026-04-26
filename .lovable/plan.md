
## 🔍 Honest Findings First

I dug into the codebase before planning — here's what's actually happening today:

### 1. Notifications — UI exists, but nothing is wired up
- The Settings page exposes 4 toggles (Email Leads, Email Taps, In-App Leads, In-App Taps) and saves them to `localStorage` under `notification_prefs`.
- **Nothing reads these preferences.** No code anywhere consults `notifPrefs`. Toggling them is purely cosmetic.
- **No email infrastructure exists.** No `send-transactional-email` function, no email templates, no domain configured. Zero emails have ever been sent.
- **No in-app toast/notification fires** when a lead arrives or a card is tapped — even though Realtime is already subscribed in `useNfcData`.

### 2. Cookie banner "keeps asking"
- The banner logic itself is correct — once `localStorage["cookie-consent"]` is set, it never shows again **in that browser, on that origin**.
- It re-appears in three real cases: (a) different domains (`id-preview…lovable.app` vs `handshake-card.lovable.app` vs Vercel) each have their own localStorage, (b) private/incognito windows, (c) when "Delete All Cookie Data" is clicked in Settings (it clears `cookie-consent`, retriggering the banner on next route).
- It does **not** actually delete any cookies — it only manages the user's stated *preferences*. There's no cookie-clearing logic, no analytics gating that reads the prefs.

### 3. Configurations don't persist across sessions/devices
This is the root issue and it's correct: **everything is in `localStorage`**. None of these are stored server-side:
- `admin_theme` / `admin_color_mode` (theme)
- `nfc_dash_engagement_order`, `nfc_dash_technical_order`, `nfc_dash_security_order`, `nfc_dash_chart_visibility` (dashboard layout)
- `nfc_widget_order`, `nfc_widget_visibility` (KPI widgets)
- `nfc_dash_chart_palette`, `nfc_dash_custom_colors` (chart colors)
- `nfc_dash_chart_sizes` (resized chart cards)
- `notification_prefs`
- `nfc_sidebar_order_*` (sidebar drag-order)

→ New browser, new device, incognito, or cleared cache = everything resets to defaults.

### 4. Dashboard look is genuinely cluttered
- 4 tabs (Engagement / Personas / Technical / Security) each render 3–6 chart cards in a tight grid.
- The KPI strip on top can show up to 13 widgets in a 4-column grid → wraps awkwardly at 1280px.
- Heavy `glass-card`, animate-fade-in everywhere, dense 10–12px text, three tiny header buttons (Charts, Palette, Reset, Export, Timeframe, Live badge) cramming the same row.

---

## 🎯 The Plan

### Part A — Sync user settings to the cloud (the foundation)

Create a single `user_preferences` table keyed on `user_id` storing one JSONB blob. Add a tiny `usePreferences()` hook that:
- Loads on login (with localStorage as instant cache to avoid flash).
- Auto-saves with a 600 ms debounce on every change.
- Migrates existing `localStorage` keys into the cloud on first load (no user action needed).

Migrate every key listed in §3 above to read/write through this hook. Result: **change theme on phone → reflected on laptop next login.**

```sql
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- RLS: owner-only select/insert/update
```

### Part B — Real notifications (in-app + email)

**B1 — In-app toasts (works immediately, no setup):**
- Subscribe to `lead_captures` + `interaction_logs` realtime in a new `<NotificationListener />` mounted at the app root.
- Fire a sonner toast when (a) a new lead arrives and `inAppLeads` is on, or (b) a tap happens and `inAppTaps` is on (throttled to 1/min so high-traffic days don't spam).
- Add a bell icon in the header showing an unread count + a dropdown with the last 20 notifications, persisted in `user_preferences.notifications`.

**B2 — Email notifications (requires email infra):**
- Set up Lovable's built-in email infrastructure (domain → infra → transactional templates).
- Create two React Email templates: `new-lead.tsx` and `tap-digest.tsx`.
- Trigger via a small `notify-user` edge function that runs on a database trigger:
  - Lead inserted → send `new-lead` immediately (if `emailLeads`).
  - Taps → batch into a daily digest at 9am user-local time (if `emailTaps`) — avoids hammering the inbox per tap.
- Each email includes a working unsubscribe link.

> **Note**: Email sending requires a verified email domain. I'll prompt you to set one up when we hit that step. In-app notifications work without it.

### Part C — Cookie banner clarity

- Stop "Delete All Cookie Data" from instantly retriggering the banner — keep `essential` recorded as accepted so the banner stays dismissed (only re-prompts if the user explicitly clicks a new "Reset privacy choices" button).
- Actually **honor** the analytics/functional toggles: gate localStorage writes for non-essential keys on `getCookiePrefs().functional`, and gate any future analytics calls on `.analytics`.
- Add a one-line note in the banner: "Settings sync to your account once you're logged in" — explains why a new browser shows it again.
- Move the cookie consent record into `user_preferences` once the user logs in, so it follows them across browsers.

### Part D — Dashboard visual refresh

Goal: less clutter, better hierarchy, more breathing room. Concretely:

1. **Header redesign** — collapse the toolbar into a sticky two-row mini-header:
   - Row 1: Page title + greeting + Live badge.
   - Row 2: Timeframe + a single overflow `…` menu containing Charts, Palette, Export, Reset.
2. **KPI strip** — switch from "13 widgets in a 4-col grid" to a horizontal scroll-snap rail on mobile and a 3-tier hierarchy on desktop (3 hero cards + smaller "more metrics" expandable panel). Reduces visual weight by ~60%.
3. **Tabs → segmented pill nav** with icons (Engagement / Personas / Technical / Security), sticky under the header.
4. **Cards** — reduce `glass-card` opacity, increase padding from `p-4` → `p-5`, raise body text from 12px → 13px, add real section dividers.
5. **Spacing scale** — adopt consistent 8/16/24/32 spacing rhythm; remove the current mix of `gap-3`, `gap-4`, `space-y-6`, `space-y-4` happening in the same view.
6. **Empty/zero states** — replace "0" / "—" stat cards with friendly hint copy ("No taps yet — share your link!").
7. Keep the iOS aesthetic + drag-to-reorder + resize — only the chrome changes, not the underlying widgets.

### Part E — Acceptance checks

After implementation I'll verify:
- Toggle theme on one browser → log into a different browser → theme matches.
- Submit a lead via public profile → toast appears in dashboard within 2s.
- Settings page shows "Synced ✓" indicator after each change.
- Cookie banner appears once per account (not per browser) once logged in.
- Dashboard at 1280px no longer has wrapping/cramped header buttons.

---

## 📦 What I'll touch

**New:**
- `supabase/migrations/…_user_preferences.sql`
- `src/hooks/usePreferences.ts`
- `src/components/NotificationListener.tsx`
- `src/components/NotificationBell.tsx`
- `supabase/functions/notify-user/index.ts`
- `supabase/functions/_shared/transactional-email-templates/new-lead.tsx`
- `supabase/functions/_shared/transactional-email-templates/tap-digest.tsx`

**Refactored:**
- `src/contexts/DashboardThemeContext.tsx` (cloud-synced)
- `src/pages/Index.tsx` (cloud-synced + visual refresh)
- `src/pages/SettingsPage.tsx` (cloud-synced + "Synced ✓" indicators)
- `src/components/CookieConsentBanner.tsx` (cloud sync once logged in, real gating)
- `src/components/AppSidebar.tsx`, `WidgetManager.tsx`, `SortableChartCard.tsx`, `ChartPaletteSelector.tsx` (read/write via `usePreferences`)
- `src/components/DashboardLayout.tsx` (header redesign)

**Memory updates:**
- New `mem://features/cloud-synced-preferences`
- New `mem://features/notification-system`
- Update `mem://features/settings-management`

---

## ❓ Two quick decisions before I build

If you have a preference, tell me — otherwise I'll go with the recommended defaults.
