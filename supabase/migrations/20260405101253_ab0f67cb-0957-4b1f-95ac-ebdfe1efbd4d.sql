ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Space Grotesk',
  ADD COLUMN IF NOT EXISTS text_alignment text DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS card_blur numeric DEFAULT 12,
  ADD COLUMN IF NOT EXISTS card_texture text DEFAULT 'none';