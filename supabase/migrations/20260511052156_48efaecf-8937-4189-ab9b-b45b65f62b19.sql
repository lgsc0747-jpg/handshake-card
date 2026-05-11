
-- ============ persona_member_grants ============
CREATE TABLE public.persona_member_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  persona_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  section text NOT NULL CHECK (section IN ('identity','design','blocks','cards','leads','analytics','inbox','goals')),
  permission text NOT NULL CHECK (permission IN ('view','edit','manage')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (persona_id, member_user_id, section)
);
CREATE INDEX idx_pmg_member ON public.persona_member_grants (member_user_id);
CREATE INDEX idx_pmg_persona ON public.persona_member_grants (persona_id);
CREATE INDEX idx_pmg_org ON public.persona_member_grants (organization_id);

ALTER TABLE public.persona_member_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage grants"
ON public.persona_member_grants FOR ALL TO authenticated
USING (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'))
WITH CHECK (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'));

CREATE POLICY "Members read own grants"
ON public.persona_member_grants FOR SELECT TO authenticated
USING (member_user_id = auth.uid());

-- Helper: does _user have at least _permission on _section of _persona?
-- owner of persona always returns true.
CREATE OR REPLACE FUNCTION public.has_persona_section_access(
  _user_id uuid, _persona_id uuid, _section text, _required_permission text DEFAULT 'view'
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_perm text;
  v_rank int;
  v_required_rank int;
BEGIN
  IF _user_id IS NULL OR _persona_id IS NULL THEN RETURN false; END IF;
  SELECT user_id INTO v_owner FROM public.personas WHERE id = _persona_id;
  IF v_owner IS NULL THEN RETURN false; END IF;
  IF v_owner = _user_id THEN RETURN true; END IF;

  SELECT permission INTO v_perm
  FROM public.persona_member_grants
  WHERE persona_id = _persona_id AND member_user_id = _user_id AND section = _section
  LIMIT 1;
  IF v_perm IS NULL THEN RETURN false; END IF;

  v_rank := CASE v_perm WHEN 'view' THEN 1 WHEN 'edit' THEN 2 WHEN 'manage' THEN 3 ELSE 0 END;
  v_required_rank := CASE _required_permission WHEN 'view' THEN 1 WHEN 'edit' THEN 2 WHEN 'manage' THEN 3 ELSE 99 END;
  RETURN v_rank >= v_required_rank;
END $$;

-- ============ lead_captures extensions ============
ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.lead_captures (assigned_to);

-- Allow team members with leads access to read leads
CREATE POLICY "Team can view granted leads"
ON public.lead_captures FOR SELECT TO authenticated
USING (public.has_persona_section_access(auth.uid(), persona_id, 'leads', 'view'));

CREATE POLICY "Team can update granted leads"
ON public.lead_captures FOR UPDATE TO authenticated
USING (public.has_persona_section_access(auth.uid(), persona_id, 'leads', 'edit'))
WITH CHECK (public.has_persona_section_access(auth.uid(), persona_id, 'leads', 'edit'));

-- ============ lead_messages ============
CREATE TABLE public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  persona_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('note','email_out')),
  subject text,
  body text NOT NULL,
  email_message_id text,
  delivery_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lm_lead ON public.lead_messages (lead_id, created_at DESC);
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lead messages with access"
ON public.lead_messages FOR SELECT TO authenticated
USING (public.has_persona_section_access(auth.uid(), persona_id, 'inbox', 'view'));

CREATE POLICY "Author insert lead messages with access"
ON public.lead_messages FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND public.has_persona_section_access(auth.uid(), persona_id, 'inbox', 'edit')
);

CREATE POLICY "Author delete own messages"
ON public.lead_messages FOR DELETE TO authenticated
USING (author_user_id = auth.uid());

-- ============ agency_email_templates ============
CREATE TABLE public.agency_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read templates" ON public.agency_email_templates
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins write templates" ON public.agency_email_templates
FOR ALL TO authenticated
USING (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'))
WITH CHECK (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'));

CREATE TRIGGER trg_aet_updated_at BEFORE UPDATE ON public.agency_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ agency_goals + items ============
CREATE TABLE public.agency_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  persona_id uuid,
  assignee_user_id uuid,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_goals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_goals_org ON public.agency_goals (organization_id);

CREATE POLICY "Members read goals" ON public.agency_goals
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members create goals" ON public.agency_goals
FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());
CREATE POLICY "Creator/assignee/admin update goals" ON public.agency_goals
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assignee_user_id = auth.uid()
  OR public.org_role_of(auth.uid(), organization_id) IN ('owner','admin')
);
CREATE POLICY "Creator/admin delete goals" ON public.agency_goals
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.org_role_of(auth.uid(), organization_id) IN ('owner','admin')
);

CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.agency_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agency_goal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.agency_goals(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_goal_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_goal_items_goal ON public.agency_goal_items (goal_id, sort_order);

CREATE POLICY "Members read goal items" ON public.agency_goal_items
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agency_goals g
          WHERE g.id = goal_id AND public.is_org_member(auth.uid(), g.organization_id))
);
CREATE POLICY "Members write goal items" ON public.agency_goal_items
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.agency_goals g
          WHERE g.id = goal_id AND public.is_org_member(auth.uid(), g.organization_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.agency_goals g
          WHERE g.id = goal_id AND public.is_org_member(auth.uid(), g.organization_id))
);

-- ============ agency_activity ============
CREATE TABLE public.agency_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  verb text NOT NULL,
  target_type text,
  target_id uuid,
  summary text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_org ON public.agency_activity (organization_id, created_at DESC);

CREATE POLICY "Members read activity" ON public.agency_activity
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members write activity" ON public.agency_activity
FOR INSERT TO authenticated
WITH CHECK (actor_user_id = auth.uid() AND public.is_org_member(auth.uid(), organization_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_activity;

-- ============ agency_settings ============
CREATE TABLE public.agency_settings (
  organization_id uuid PRIMARY KEY,
  reply_to_email text,
  sender_name text,
  first_response_sla_minutes integer NOT NULL DEFAULT 240,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read settings" ON public.agency_settings
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Admins write settings" ON public.agency_settings
FOR ALL TO authenticated
USING (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'))
WITH CHECK (public.org_role_of(auth.uid(), organization_id) IN ('owner','admin'));

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.agency_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Bulk grant RPC (apply preset) ============
CREATE OR REPLACE FUNCTION public.set_persona_grants(
  _org_id uuid, _persona_id uuid, _member uuid, _grants jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.org_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_role := public.org_role_of(auth.uid(), _org_id);
  IF v_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.personas WHERE id = _persona_id AND user_id = (
    SELECT owner_user_id FROM public.organizations WHERE id = _org_id
  )) THEN
    -- only enforce that persona owner is org owner; otherwise still allow
    NULL;
  END IF;

  DELETE FROM public.persona_member_grants
  WHERE persona_id = _persona_id AND member_user_id = _member;

  INSERT INTO public.persona_member_grants (organization_id, persona_id, member_user_id, section, permission, granted_by)
  SELECT _org_id, _persona_id, _member, (g->>'section'), (g->>'permission'), auth.uid()
  FROM jsonb_array_elements(_grants) g
  WHERE g->>'section' IS NOT NULL AND g->>'permission' IS NOT NULL;
END $$;
