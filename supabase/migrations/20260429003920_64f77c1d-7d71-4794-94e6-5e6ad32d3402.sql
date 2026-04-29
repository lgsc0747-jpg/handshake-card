-- 1) Extend short_links with manageable fields
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Replace get_public_persona so it no longer requires is_active when no slug
--    is given. Falls back to the most recently created persona.
CREATE OR REPLACE FUNCTION public.get_public_persona(p_user_id uuid, p_slug text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, slug text, label text, is_active boolean, is_private boolean, has_pin boolean, require_contact_exchange boolean, display_name text, headline text, bio text, avatar_url text, email_public text, phone text, location text, website text, linkedin_url text, github_url text, cv_url text, accent_color text, secondary_color text, tertiary_color text, text_color text, landing_bg_color text, background_preset text, background_image_url text, card_bg_image_url text, card_bg_size text, glass_opacity numeric, font_family text, text_alignment text, card_blur numeric, card_texture text, availability_status text, work_mode text, show_availability boolean, show_location boolean, user_id uuid, border_radius integer, shadow_preset text, card_animation text, avatar_position jsonb, card_bg_position jsonb, bg_image_position jsonb, page_theme text, page_mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.user_id,
    p.border_radius, p.shadow_preset, p.card_animation,
    p.avatar_position, p.card_bg_position, p.bg_image_position,
    p.page_theme,
    p.page_mode
  FROM public.personas p
  WHERE p.user_id = p_user_id
    AND (p_slug IS NULL OR p.slug = p_slug)
  ORDER BY (p_slug IS NULL AND p.is_active) DESC NULLS LAST,
           p.created_at ASC
  LIMIT 1;
$function$;

-- 3) Add a stats helper RPC: per-link tap counts (aggregated from interaction_logs)
CREATE OR REPLACE FUNCTION public.short_link_stats(p_user_id uuid)
 RETURNS TABLE(short_link_id uuid, code text, taps bigint, last_tap_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    sl.id AS short_link_id,
    sl.code,
    COUNT(il.id) AS taps,
    MAX(il.created_at) AS last_tap_at
  FROM public.short_links sl
  LEFT JOIN public.interaction_logs il
    ON il.card_id = sl.card_id
   AND il.user_id = sl.user_id
   AND il.interaction_type = 'profile_view'
  WHERE sl.user_id = p_user_id
  GROUP BY sl.id, sl.code;
$function$;