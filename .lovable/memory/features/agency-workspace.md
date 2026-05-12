---
name: Agency Workspace
description: Single auto-provisioned workspace per agency account, persona×section grants, lead inbox, goals, templates, SLA
type: feature
---
**Single workspace model**: Each user with `account_type = 'agency'` gets exactly one auto-provisioned organization owned by them. AgencyPage no longer exposes workspace creation/switching UI — it loads the user's owned org and creates one if missing.

**Tables**: persona_member_grants, lead_messages, agency_email_templates, agency_goals(+items), agency_activity (realtime), agency_settings. lead_captures gained `assigned_to`, `first_response_at`.

**RPCs**:
- `has_persona_section_access(user, persona, section, perm)` — owner=true; ranks view<edit<manage.
- `set_persona_grants(org, persona, member, jsonb[])` — bulk apply preset (owner/admin only).
- `invite_org_member(org, identifier, role)` — blocks self-invite (raises if `v_user = auth.uid()`).
- `remove_org_member(org, member_user_id)` — owner/admin only; cannot remove workspace owner; cascades persona grants.
- `leave_organization(org)` — any member except the owner; cascades persona grants.

**Sections**: identity, design, blocks, cards, leads, analytics, inbox, goals. Presets: Viewer / Editor / Lead Manager / Analyst.

**UI**: AgencyMembers shows `(you)` marker, hides Permissions for self where appropriate, exposes Leave for non-owner self and Remove (X) for owner on other members. ConfirmDialog gates both destructive flows.

