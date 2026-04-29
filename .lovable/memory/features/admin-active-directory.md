---
name: Admin Active Directory & Support
description: Admin can send password reset emails per user, triage support tickets, unlock locked accounts; admin nav hidden in user view mode
type: feature
---

**Admin password reset (AD-style)**: Per-user "Reset Password" button in `/admin` calls `admin-manage` with `action: send_password_reset` → uses `auth.admin.getUserById` then `resetPasswordForEmail` (redirect to `/reset-password`). Audit-logged as `send_password_reset`.

**Support tickets**: `support_tickets` table (user_id, subject, message, status [open/in_progress/resolved/closed], priority [low/normal/high], admin_notes). RLS: users CRUD their own; admins SELECT/UPDATE all. User-facing page `/help` (HelpPage). Admin triage component `AdminSupportTickets` rendered at bottom of `/admin`. Admin actions: `list_support_tickets`, `update_support_ticket` (sets `assigned_admin_id` to current admin).

**Account unlock**: `AdminLockouts` component (super-admin only) lists active lockouts and offers an "Unlock" button → `admin-manage` `clear_lockout` with email.

**View-mode nav hiding**: When the current admin is on user routes (not `/admin/*`), the sidebar omits "Admin Panel" + "Turnstile Settings" entries. They reappear once they switch to admin view via the existing View Mode pill or visit `/admin` directly.
