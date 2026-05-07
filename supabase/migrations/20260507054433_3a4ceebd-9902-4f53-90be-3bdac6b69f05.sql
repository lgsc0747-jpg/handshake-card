-- ============== Agency messages ==============
CREATE TABLE IF NOT EXISTS public.agency_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid,
  subject text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agency_messages_org ON public.agency_messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_messages_recipient ON public.agency_messages(recipient_user_id);

ALTER TABLE public.agency_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read org messages" ON public.agency_messages
FOR SELECT TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id)
  AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid() OR sender_user_id = auth.uid())
);

CREATE POLICY "Sender can mark read" ON public.agency_messages
FOR UPDATE TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.send_agency_message(
  _org_id uuid, _recipient uuid, _subject text, _body text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_org_member(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  IF _recipient IS NOT NULL AND NOT public.is_org_member(_recipient, _org_id) THEN
    RAISE EXCEPTION 'Recipient is not a member of this organization';
  END IF;
  IF coalesce(trim(_body), '') = '' THEN RAISE EXCEPTION 'Message body required'; END IF;

  INSERT INTO public.agency_messages (organization_id, sender_user_id, recipient_user_id, subject, body)
  VALUES (_org_id, auth.uid(), _recipient, _subject, _body)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ============== Profile-view rate limit ==============
CREATE TABLE IF NOT EXISTS public.profile_view_attempts (
  id bigserial PRIMARY KEY,
  visitor_ip text NOT NULL,
  target_user_id uuid NOT NULL,
  source_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pva_ip_time ON public.profile_view_attempts(visitor_ip, created_at DESC);

ALTER TABLE public.profile_view_attempts ENABLE ROW LEVEL SECURITY;
-- No client-side policies; only edge function via service role.

CREATE OR REPLACE FUNCTION public.count_distinct_profiles_by_ip(
  _ip text, _minutes int DEFAULT 5
) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT target_user_id)::int
  FROM public.profile_view_attempts
  WHERE visitor_ip = _ip
    AND created_at > now() - make_interval(mins => _minutes);
$$;

CREATE OR REPLACE FUNCTION public.record_profile_view_attempt(
  _ip text, _target uuid, _source text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_view_attempts (visitor_ip, target_user_id, source_method)
  VALUES (_ip, _target, _source);
  -- opportunistic purge
  IF random() < 0.05 THEN
    DELETE FROM public.profile_view_attempts WHERE created_at < now() - interval '30 minutes';
  END IF;
END $$;