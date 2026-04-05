export interface PersonaDesign {
  id: string;
  slug: string;
  label: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  email_public: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  accent_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  text_color: string | null;
  landing_bg_color: string | null;
  background_preset: string | null;
  background_image_url: string | null;
  card_bg_image_url: string | null;
  glass_opacity: number | null;
  font_family: string | null;
  text_alignment: string | null;
  card_blur: number | null;
  card_texture: string | null;
}
