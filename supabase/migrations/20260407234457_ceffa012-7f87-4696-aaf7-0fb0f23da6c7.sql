CREATE OR REPLACE FUNCTION public.is_user_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = p_user_id
      AND plan = 'pro'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;