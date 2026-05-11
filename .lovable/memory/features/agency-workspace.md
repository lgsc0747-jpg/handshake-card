---
name: Agency Workspace
description: Multi-seat workspace with persona×section grants, lead inbox (email+notes), goals, templates, activity feed, SLA
type: feature
---
**Tables**: persona_member_grants, lead_messages, agency_email_templates, agency_goals(+items), agency_activity (realtime), agency_settings. lead_captures gained `assigned_to`, `first_response_at`.

**RPCs**: `has_persona_section_access(user, persona, section, perm)` — owner=true; ranks view<edit<manage. `set_persona_grants(org, persona, member, jsonb[])` — bulk apply preset (owner/admin only).

**Sections**: identity, design, blocks, cards, leads, analytics, inbox, goals. Presets: Viewer / Editor / Lead Manager / Analyst.

**Edge fn**: `send-lead-email` — gates via has_persona_section_access(inbox, edit), sends through Resend gateway with `Reply-To` from agency_settings, logs to lead_messages + agency_activity, stamps first_response_at.

**Hook**: `usePersonaSectionAccess(personaId, section, perm)` for gating edit affordances.

**Page**: /agency tabs — Overview / Members / Inbox / Goals / Templates / Settings. Workspace switcher at top. AgencyInbox uses split layout (lead list + thread + composer with email/note tabs and template picker).
