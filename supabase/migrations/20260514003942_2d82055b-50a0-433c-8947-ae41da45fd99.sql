ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS layout_mode text NOT NULL DEFAULT 'stack',
  ADD COLUMN IF NOT EXISTS canvas_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_pages_layout_mode_check'
  ) THEN
    ALTER TABLE public.site_pages
      ADD CONSTRAINT site_pages_layout_mode_check
      CHECK (layout_mode IN ('stack','grid','free'));
  END IF;
END $$;