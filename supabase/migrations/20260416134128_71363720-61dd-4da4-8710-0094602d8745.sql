DROP FUNCTION IF EXISTS public.get_public_persona(uuid, text);

CREATE FUNCTION public.get_public_persona(p_user_id uuid, p_slug text DEFAULT NULL::text)
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
    AND (p_slug IS NOT NULL OR p.is_active = true)
  LIMIT 1;
$function$;