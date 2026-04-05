
-- RPC for public profile lookup (safe fields only)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  headline text,
  bio text,
  avatar_url text,
  website text,
  linkedin_url text,
  github_url text,
  location text,
  show_location boolean,
  show_availability boolean,
  availability_status text,
  work_mode text,
  card_accent_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id, p.username, p.display_name, p.headline, p.bio, p.avatar_url,
    p.website, p.linkedin_url, p.github_url,
    CASE WHEN p.show_location THEN p.location ELSE NULL END,
    p.show_location, p.show_availability,
    CASE WHEN p.show_availability THEN p.availability_status ELSE NULL END,
    CASE WHEN p.show_availability THEN p.work_mode ELSE NULL END,
    p.card_accent_color
  FROM public.profiles p
  WHERE p.username = p_username
  LIMIT 1;
$$;

-- RPC for username availability check
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = p_username
  );
$$;
