
-- Block self-invite
CREATE OR REPLACE FUNCTION public.invite_org_member(_org_id uuid, _identifier text, _role org_role DEFAULT 'member'::org_role)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.org_role;
  v_user uuid;
  v_id uuid;
  v_ident text := lower(trim(_identifier));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_role := public.org_role_of(auth.uid(), _org_id);
  IF v_role IS NULL OR v_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF _role = 'owner' THEN
    RAISE EXCEPTION 'Cannot assign owner role via invite';
  END IF;

  SELECT user_id INTO v_user
  FROM public.profiles
  WHERE lower(username) = v_ident OR lower(email_public) = v_ident
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No user found for "%". Ask them to sign up and set a username first.', _identifier;
  END IF;

  IF v_user = auth.uid() THEN
    RAISE EXCEPTION 'You cannot invite yourself.';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (_org_id, v_user, _role, auth.uid())
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Remove a member (owner/admin only; cannot remove the workspace owner)
CREATE OR REPLACE FUNCTION public.remove_org_member(_org_id uuid, _member_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.org_role;
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_role := public.org_role_of(auth.uid(), _org_id);
  IF v_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  SELECT owner_user_id INTO v_owner FROM public.organizations WHERE id = _org_id;
  IF _member_user_id = v_owner THEN
    RAISE EXCEPTION 'Cannot remove the workspace owner.';
  END IF;
  DELETE FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _member_user_id;
  DELETE FROM public.persona_member_grants
  WHERE organization_id = _org_id AND member_user_id = _member_user_id;
END $$;

-- Leave a workspace (any member, except the owner)
CREATE OR REPLACE FUNCTION public.leave_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT owner_user_id INTO v_owner FROM public.organizations WHERE id = _org_id;
  IF v_owner = auth.uid() THEN
    RAISE EXCEPTION 'Workspace owners cannot leave their own workspace.';
  END IF;
  DELETE FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = auth.uid();
  DELETE FROM public.persona_member_grants
  WHERE organization_id = _org_id AND member_user_id = auth.uid();
END $$;
