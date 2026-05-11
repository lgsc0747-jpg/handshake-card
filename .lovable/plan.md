## Agency Workspace Rebuild

A complete rebuild of `/agency` into a true multi-seat workspace with granular delegation, a real inbox for leads, and team productivity features.

### 1. Granular Permissions (per persona × per section × per member)

New table `persona_member_grants`:
- `organization_id`, `persona_id`, `member_user_id`
- `section`: enum-ish text — `identity`, `design`, `blocks`, `cards`, `leads`, `analytics`, `inbox`, `goals`
- `permission`: `view` | `edit` | `manage`
- Plus four **role presets** in UI: Viewer, Editor, Lead Manager, Analyst — each writes a bundle of grants.

Owner/admin opens a persona, sees a matrix: rows = members, columns = sections, cells = view/edit/manage dropdown. Save persists rows.

A new SECURITY DEFINER RPC `has_persona_section_access(_persona_id, _section, _permission)` is called from existing pages to gate edit affordances. Lead/inbox/goals tables get RLS using this RPC, so non-owners can read/write only what they're granted.

### 2. Lead Inbox with Outbound Email + Internal Notes

Per-lead conversation thread inside Agency → Inbox:
- New table `lead_messages`: `lead_id`, `author_user_id`, `kind` (`note` | `email_out`), `body`, `subject`, `email_message_id`, `created_at`.
- Compose box with two tabs: **Send Email** (goes out via shared agency address) and **Internal Note** (team-only).
- Outbound emails routed through a new edge function `send-lead-email` that uses Lovable Emails (notify subdomain) with `From: "<Org name> <team@notify.handshake-nfc.online>"` and `Reply-To: agency_settings.reply_to_email` (configurable per org). Lead receives a real email; replies land in the configured reply-to inbox (no inbound capture this pass).
- Each sent email is logged in `lead_messages` and `email_send_log`; thread shows delivery status badge.
- Reusable **email templates** (`agency_email_templates` table, org-scoped) selectable from the compose box with `{{lead_name}}`, `{{persona}}`, `{{owner}}` token replacement.

### 3. Goals & Checklist

New table `agency_goals`: `organization_id`, `persona_id?`, `assignee_user_id?`, `title`, `description`, `due_at`, `created_by`, plus `agency_goal_items`: `goal_id`, `label`, `is_done`, `done_at`, `done_by`, `sort_order`.

UI: collapsible Goals card per persona (and an "All goals" tab in Agency). Big "+ Goal" FAB. Click a goal → drawer with check-listable items, progress bar, due-date pill, assignee avatar.

### 4. Lead Assignment & SLA

- Add `assigned_to uuid` and `first_response_at timestamptz` columns to `lead_captures`.
- Inbox lists show assignee avatar; unassigned leads filter chip.
- SLA: org-level `first_response_sla_minutes` (default 240). Overdue leads get a red "Overdue" badge based on `created_at + sla - first_response_at IS NULL`.
- `first_response_at` is auto-stamped on first `email_out` message.

### 5. Activity Feed + @mentions

New table `agency_activity`: `organization_id`, `actor_user_id`, `verb`, `target_type`, `target_id`, `summary`, `mentions uuid[]`, `created_at`.
- Triggers (or write-through in app code) log: lead assigned, email sent, note added, goal completed, member added, persona shared.
- Right-rail "Activity" panel with realtime subscription (Supabase Realtime on `agency_activity`).
- `@username` autocomplete in note/email composers; mentioned users get an in-app notification (reuse `NotificationListener` + a new `mention` notification type).

### 6. Page Restructure

Tabs in `/agency`:
1. **Overview** — KPI strip (open leads, overdue, goals progress, members), recent activity feed.
2. **Members** — list + per-member quick role; "Permissions" button opens the persona×section matrix.
3. **Personas** — pick a persona to manage sharing, see who has which sections.
4. **Inbox** — lead list (filters: assignee, persona, overdue, unread) + thread view + composer.
5. **Goals** — kanban-ish list grouped by status (Active / Done).
6. **Templates** — manage shared email templates.
7. **Settings** — org name, shared reply-to email, SLA minutes, default sender name.

Profile/Account/Persona settings pages get a small "Shared with team" indicator when applicable, and edit affordances hide based on `has_persona_section_access`.

### Technical Details

```text
NEW TABLES
  persona_member_grants      RLS: org admins manage; member can read own grants
  lead_messages              RLS: visible if owner OR has_persona_section_access(persona, 'inbox', 'view')
  agency_email_templates     RLS: org members read; admins write
  agency_goals + items       RLS: org members read; assignee/creator/admin write
  agency_activity            RLS: org members read; service role + RPC writes
  agency_settings            (1 row per org) reply_to_email, sender_name, sla_minutes

NEW EDGE FUNCTIONS
  send-lead-email            validates JWT, checks has_persona_section_access,
                             enqueues via Lovable Emails queue, logs to lead_messages
  agency-activity-log        thin wrapper used by client to insert activity rows

CHANGES TO EXISTING
  lead_captures: + assigned_to, first_response_at columns + index
  PersonaPage / DesignStudio / BlockEditor: gate edit buttons with new hook
  NotificationListener: subscribe to mentions
```

### Out of scope this pass
- Inbound email parsing (lead replies still land in your real inbox via Reply-To).
- Per-persona custom sender domains.
- Billing/seat limits.

I'll implement everything above; the migration runs first (one approval), then code lands in a single sweep.
