---
name: Role Based Access Control
description: RBAC tiers (user / admin / super_admin), Cloudflare Turnstile CAPTCHA on all logins, account lockout system, secure-login + admin-manage edge functions, admin audit trail
type: feature
---

The Role-Based Access Control (RBAC) system uses a `user_roles` table with three tiers stored in the `app_role` enum: `user`, `admin`, and `super_admin`. Regular admins manage subscriptions, view audit trails, and inspect activity logs. Only super-admins may grant or revoke the admin role and clear active account lockouts. The earliest existing admin is auto-promoted to super-admin during bootstrap.

Login flow: All sign-ins (User and Admin tabs) route through the `secure-login` edge function. The function verifies a **Cloudflare Turnstile** CAPTCHA token (site key in `src/lib/turnstile.ts`, secret in `TURNSTILE_SECRET_KEY` env var), checks `account_lockouts` for an active block, and only then calls `signInWithPassword`. Failed attempts are recorded in `login_attempts`; 5+ failures within 10 minutes (per email OR per IP) trigger a 15-minute lockout. Successful sign-ins clear any lingering lockout. The `check_login_lockout` SECURITY DEFINER RPC lets the public login screen show "Account temporarily locked for security" with a live `MM:SS` countdown without leaking account existence. The submit button is disabled until the Turnstile widget reports success; tokens are single-use and reset after every submit.

Admin actions: `admin-manage` writes every privileged operation (`update_plan`, `grant_admin`, `revoke_admin`, `clear_lockout`) to `admin_audit_log` with the actor's `user_id` and request IP. Admins see only their own audit entries; super-admins see all entries. The Admin dashboard surfaces this via `<AdminAuditTrail />` (all admins) and `<AdminLockouts />` (super-admin only). The "Make Admin / Remove Admin" buttons are tooltip-disabled for regular admins.

Helper hooks: `useIsAdmin()` and `useIsSuperAdmin()`. SQL helpers: `has_role(uuid, app_role)` and `has_super_admin(uuid)` — both NULL-guarded, SECURITY DEFINER, with `search_path` set to `public`.
