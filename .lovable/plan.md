## Overview

Four bundled changes:

1. Personal profile layout — fix margins and stop rendering the page-builder tab nav on personal-mode personas.
2. NFC card registration — new 3-step flow (tap to read → label → register), with Web NFC auto-detect and a manual fallback.
3. Replace the Categories system on cards with Personas — many cards can share one persona, and many personas can coexist across distributed cards. Each tap resolves to its card's pinned persona and is recorded in interaction logs.
4. Email signup verification — re-enable email confirmation and add a 6-digit PIN code step (via Lovable auth email templates so the email is branded, not the default Lovable template).

---

## 1. Personal profile margins + remove tabs

**File:** `src/pages/PublicProfilePage.tsx`

- The `PublicPageNav` (pill-tab strip) currently renders whenever `hasPageBuilder && sitePages.length > 1`, even when `persona.page_mode === 'personal'`. Gate it on `persona?.page_mode === 'builder'` so personal mode never shows tabs.
- Personal sections render inside `max-w-lg mx-auto px-4 py-8`, but the NFC card section is full-bleed `min-h-screen`. The chained sections after the card stack vertically with no top margin and the bottom branding sits flush against the last card. Fix:
  - Add consistent vertical rhythm: `py-10 md:py-14` for non-card sections.
  - Add safe-area-aware bottom padding on the outer container (`pb-[max(2rem,env(safe-area-inset-bottom))]`) so the floating Contact Me button does not overlap content on iOS.
  - Center the hero section content with `pt-10` so it does not butt against the top edge when the tab nav is hidden.

**File:** `src/components/page-builder/PublicPageNav.tsx` — no change; just stop calling it from personal mode.

---

## 2. NFC card registration redesign

**File:** `src/pages/CardsPage.tsx` (overhaul the "Register Card" dialog)

Replace the current single-step dialog with a 3-step wizard:

```text
Step 1  Read card     [📡 Hold card to phone]   ── auto-fills serial
        └─ Manual fallback: "Type serial number" link
Step 2  Name & label  Card name • Pick persona ▾
Step 3  Confirm       [✓ Register card]
```

**Step 1 — Read card:**

- Detect Web NFC support: `'NDEFReader' in window`.
- If supported (Android Chrome): show a "Tap card now" panel with a pulsing animation. Call `new NDEFReader().scan()` → on `reading` event, extract `serialNumber` and advance to step 2.
- If unsupported (iOS, desktop): show a clean fallback: "Your browser can't read NFC. Type the serial printed on the card." with an input field.
- Errors (permission denied, scan aborted) surface a retry button and a link to manual entry.

**Step 2 — Name & label:**

- Inputs: card label (free text) + persona dropdown (lists all the user's personas, with their accent color dot).
- The persona dropdown is required — no "active persona" option. This is the key behavioral change.

**Step 3 — Register:**

- Insert into `nfc_cards` with `serial_number`, `label`, and a new `persona_id` column.
- On success, close wizard and toast "Card registered."

**Card list view (existing cards on the same page):**

- Replace the Category dropdown on each card with a Persona dropdown.
- Show the assigned persona's accent color as a small dot + name on the card.
- Keep the existing edit / delete / status switch.

**File:** `src/pages/CategoriesPage.tsx`, `src/components/AppSidebar.tsx`

- Remove the Categories nav entry from `DEFAULT_NFC` and from `ICON_MAP`.
- Keep `CategoriesPage.tsx` as a stub that redirects to `/cards`, OR delete the route in `App.tsx`. I'll delete the route and remove the file to keep the sidebar clean.

---

## 3. Card → Persona linking + interaction logs

**Database migration:**

```sql
-- 1. Add persona link to nfc_cards
alter table public.nfc_cards
  add column persona_id uuid references public.personas(id) on delete set null;

create index nfc_cards_persona_id_idx on public.nfc_cards(persona_id);

-- 2. Backfill: any card with current_category_id stays as-is (column kept for now);
--    new cards will use persona_id only. We'll deprecate current_category_id in code.
```

Note: we keep `categories` and `nfc_cards.current_category_id` columns in the DB to avoid breaking historical interaction logs, but remove all UI surface area.

**Tap resolution flow (no schema change to short_links needed):**

The Web-NFC-tap or QR-scan hits `/u/:code`, which calls `resolve-short-link`. Since cards can each pin a different persona, the short link must encode which card / persona to resolve to. Two options:

- **Option A (chosen, simpler):** generate one short link per card. `short_links` already has `persona_id` — we just always set it on insert. The user no longer needs to manage a single account-wide short link.
- The "NFC Manager" page becomes per-card: when you register a card, we auto-create a `short_links` row with that card's `persona_id` and surface the link + QR for that specific card.

**Edge function:** `supabase/functions/resolve-short-link/index.ts`

- Already reads `persona_id` off the short link — no change needed.
- After resolving, also identify the `nfc_cards.id` for that short link (lookup by `persona_id` + `user_id`, or store `card_id` directly on `short_links` via a new column for accuracy):
  ```sql
  alter table public.short_links
    add column card_id uuid references public.nfc_cards(id) on delete cascade;
  create index short_links_card_id_idx on public.short_links(card_id);
  ```
- Return `card_id` in the resolve response so the client can pass it into `log-interaction`.

**Edge function:** `supabase/functions/log-interaction/index.ts`

- Accept an optional `card_id` and `card_serial` in the body.
- Validate the card belongs to `target_user_id`.
- Insert into `interaction_logs.card_id` and `card_serial` (columns already exist).

**Client:**

- `ShortUrlRedirect.tsx` passes the resolved `card_id` to the public profile page (via state or query param).
- `PublicProfilePage.tsx` includes `card_id` in the initial `profile_view` log payload.

This achieves the goal: each tap is recorded with the exact card used + the persona it served.

**File:** `src/pages/NfcManagerPage.tsx`

- Convert from "one link for the whole account" to "one section per registered card."
- Each card section shows its persona, its short link, its QR, and its NDEF write guide.
- The Page Mode toggle (Personal / Page Builder) moves to the persona-level (already set on personas table) — surface it in `PersonasPage.tsx` instead of here.

---

## 4. Email signup verification with 6-digit PIN

**Goal:** Email confirmation comes through with branded copy ("Handshake," not "Lovable preview"). The user enters a 6-digit code on the signup page rather than clicking a magic link — this avoids the cross-origin Vercel/Lovable redirect issue.

**Approach:** Use Supabase's built-in OTP signup flow + Lovable Auth Email Templates.

**Setup orchestration (handled by the agent during implementation):**

1. Check email domain status. If no domain is configured, show the email setup dialog.
2. Once a domain exists, scaffold Lovable Auth Email Templates (`signup`, `recovery`, `magic-link`).
3. Apply Handshake brand styling to the templates: slate/teal palette from `index.css`, white email body background, "Handshake" wordmark, SF Pro/Inter font stack.
4. Update the signup template to display `{{ .Token }}` (the 6-digit OTP) prominently — **do not** include the magic link.
5. Deploy `auth-email-hook`.

**Supabase auth config:**

- Disable auto-confirm so emails are required.
- Keep the email signup OTP enabled (default).

**File:** `src/pages/SignupPage.tsx`

- After `supabase.auth.signUp` succeeds, do **not** show the "check your email for a link" toast. Instead push the user into a new `EmailVerifyStep` view (same page, `useState` step machine).
- Show 6 OTP slots using the existing `InputOTP` component.
- On 6 digits entered, call:
  ```ts
  await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  ```
- On success: navigate to `/`. On failure: show error + "Resend code" button that calls `supabase.auth.resend({ type: 'signup', email })`.

**File:** `src/pages/LoginPage.tsx` — no change. Login still uses password + Turnstile CAPTCHA per the previous secure-login flow. (User answer confirmed the PIN is for signup confirmation only.)

---

## Files touched

**Database migrations:**
- Add `nfc_cards.persona_id` column + index.
- Add `short_links.card_id` column + index.

**Frontend:**
- `src/pages/PublicProfilePage.tsx` — gate tab nav on builder mode, fix section margins.
- `src/pages/CardsPage.tsx` — full rewrite of registration dialog (3-step wizard), swap Category dropdown for Persona dropdown.
- `src/pages/CategoriesPage.tsx` — delete file.
- `src/pages/NfcManagerPage.tsx` — restructure to per-card sections.
- `src/components/AppSidebar.tsx` — remove Categories nav item.
- `src/App.tsx` — remove `/categories` route.
- `src/pages/SignupPage.tsx` — add OTP verification step using `InputOTP`.
- `src/pages/ShortUrlRedirect.tsx` — pass `card_id` through to public profile.

**Edge functions:**
- `supabase/functions/resolve-short-link/index.ts` — return `card_id`.
- `supabase/functions/log-interaction/index.ts` — accept and store `card_id` / `card_serial`.
- `supabase/functions/auth-email-hook/*` — scaffolded by Lovable, then branded.

**Lib:**
- New `src/lib/webNfc.ts` — wraps `NDEFReader` with feature detection + retries.

---

## Memory updates after implementation

- Update `mem://features/nfc-state-management` — categories replaced by direct persona linking on each card.
- Update `mem://features/categories-management` — mark as removed.
- Update `mem://architecture/short-url-redirection` — short links now per-card with `card_id`.
- New `mem://features/email-otp-verification` — signup uses 6-digit OTP via Lovable branded auth email templates.
- New `mem://features/nfc-tap-registration` — Web NFC `NDEFReader` with manual fallback.