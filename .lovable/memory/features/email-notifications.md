---
name: Email Notification System
description: Branded auth + transactional email pipeline on notify.handshake-nfc.online with new-lead trigger and daily tap digest cron
type: feature
---
Email infrastructure on notify.handshake-nfc.online (Lovable Emails).

**Auth templates** (`supabase/functions/_shared/email-templates/`): signup, recovery, magic-link, invite, email-change, reauthentication. All share `_brand.ts` — Cyber Dark card (#0f172a) on white body, teal #0d9488 accent, SF Pro stack.

**Transactional templates** (`supabase/functions/_shared/transactional-email-templates/`):
- `new-lead.tsx` — owner notification, fired from SecurityGate + ContactMeModal after `insert_lead_capture`. Client passes `ownerUserId` + `recipientEmail: "owner@auto"`; the function resolves the email via `auth.admin.getUserById` and gates on `prefs.notifPrefs.emailLeads`.
- `daily-tap-digest.tsx` — KPI cards + top personas. Dispatched by `notify-user-digest` cron at `0 13 * * *` UTC. Gated on `prefs.notifPrefs.emailTaps === true`. Skips silent days. Idempotency key: `digest-{userId}-{YYYY-MM-DD}`.

**Server-side opt-out gate**: `send-transactional-email/index.ts` was extended — when `ownerUserId` is in the body, it loads `user_preferences.prefs` and returns `{skipped: true, reason: 'owner_opted_out'}` if the per-template flag is off.

**Unsubscribe page**: `/unsubscribe?token=...` validates via GET to `handle-email-unsubscribe`, confirms via POST.
