-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Fix personas: drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public personas are viewable by everyone" ON public.personas;

-- 2. Create a SECURITY DEFINER RPC for public persona lookup (excludes pin_code, returns has_pin boolean)
CREATE OR REPLACE FUNCTION public.get_public_persona(p_user_id uuid, p_slug text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  slug text,
  label text,
  is_active boolean,
  is_private boolean,
  has_pin boolean,
  require_contact_exchange boolean,
  display_name text,
  headline text,
  bio text,
  avatar_url text,
  email_public text,
  phone text,
  location text,
  website text,
  linkedin_url text,
  github_url text,
  cv_url text,
  accent_color text,
  secondary_color text,
  tertiary_color text,
  text_color text,
  landing_bg_color text,
  background_preset text,
  background_image_url text,
  card_bg_image_url text,
  card_bg_size text,
  glass_opacity numeric,
  font_family text,
  text_alignment text,
  card_blur numeric,
  card_texture text,
  availability_status text,
  work_mode text,
  show_availability boolean,
  show_location boolean,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.slug, p.label, p.is_active, p.is_private,
    (p.pin_code IS NOT NULL) AS has_pin,
    p.require_contact_exchange,
    p.display_name, p.headline, p.bio, p.avatar_url,
    p.email_public, p.phone, p.location, p.website,
    p.linkedin_url, p.github_url, p.cv_url,
    p.accent_color, p.secondary_color, p.tertiary_color,
    p.text_color, p.landing_bg_color,
    p.background_preset, p.background_image_url,
    p.card_bg_image_url, p.card_bg_size,
    p.glass_opacity, p.font_family, p.text_alignment,
    p.card_blur, p.card_texture,
    p.availability_status, p.work_mode,
    p.show_availability, p.show_location,
    p.user_id
  FROM public.personas p
  WHERE p.user_id = p_user_id
    AND (p_slug IS NULL OR p.slug = p_slug)
    AND (p_slug IS NOT NULL OR p.is_active = true)
  LIMIT 1;
$$;

-- 3. Create verify_persona_pin RPC
CREATE OR REPLACE FUNCTION public.verify_persona_pin(p_persona_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT pin_code INTO stored_hash
  FROM public.personas
  WHERE id = p_persona_id;

  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN crypt(p_pin, stored_hash) = stored_hash;
END;
$$;

-- 4. Create trigger to auto-hash pin_code on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.hash_persona_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if pin_code changed and is not already a bcrypt hash
  IF NEW.pin_code IS NOT NULL AND NEW.pin_code != '' THEN
    IF left(NEW.pin_code, 4) != '$2a$' AND left(NEW.pin_code, 4) != '$2b$' THEN
      NEW.pin_code := crypt(NEW.pin_code, gen_salt('bf'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_pin_before_upsert
  BEFORE INSERT OR UPDATE OF pin_code ON public.personas
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_persona_pin();

-- 5. Migrate existing plaintext PINs to hashed values
UPDATE public.personas
SET pin_code = crypt(pin_code, gen_salt('bf'))
WHERE pin_code IS NOT NULL
  AND left(pin_code, 4) != '$2a$'
  AND left(pin_code, 4) != '$2b$';

-- 6. Fix user_subscriptions: restrict INSERT to free plan only
ALTER POLICY "Users can insert their own subscription" ON public.user_subscriptions
  WITH CHECK (auth.uid() = user_id AND plan = 'free');

-- 7. Also restrict user UPDATE to prevent self-upgrade
ALTER POLICY "Users can update their own subscription" ON public.user_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND plan = 'free');