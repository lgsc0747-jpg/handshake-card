
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS border_radius integer DEFAULT 24;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS shadow_preset text DEFAULT 'none';
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS card_animation text DEFAULT 'tilt';
