ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS social_order jsonb NOT NULL DEFAULT '["email","website","linkedin","github"]'::jsonb;