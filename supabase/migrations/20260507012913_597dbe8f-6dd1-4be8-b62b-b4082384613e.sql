ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS communications jsonb NOT NULL DEFAULT '[]'::jsonb;