-- Helper function for super-admin role checks
CREATE OR REPLACE FUNCTION public.has_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    )
  END;
$$;

-- login_attempts table (service-role only access)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON public.login_attempts (ip_address, attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- account_lockouts table
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  ip_address text,
  locked_until timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until
  ON public.account_lockouts (locked_until);

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log (admin_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own audit entries"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  auth.uid() = admin_user_id
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can view all audit entries"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_super_admin(auth.uid()));

-- Public RPC to check lockout state without leaking account existence
CREATE OR REPLACE FUNCTION public.check_login_lockout(p_email text, p_ip text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lockout record;
  v_now timestamptz := now();
BEGIN
  SELECT email, locked_until, reason
  INTO v_lockout
  FROM public.account_lockouts
  WHERE email = lower(p_email)
    AND locked_until > v_now
  LIMIT 1;

  IF v_lockout.email IS NOT NULL THEN
    RETURN jsonb_build_object(
      'locked', true,
      'until', v_lockout.locked_until,
      'seconds_remaining', GREATEST(0, EXTRACT(EPOCH FROM (v_lockout.locked_until - v_now))::int),
      'reason', v_lockout.reason
    );
  END IF;

  RETURN jsonb_build_object('locked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_lockout(text, text) TO anon, authenticated;

-- Bootstrap: promote earliest existing admin to super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ORDER BY id
LIMIT 1
ON CONFLICT DO NOTHING;