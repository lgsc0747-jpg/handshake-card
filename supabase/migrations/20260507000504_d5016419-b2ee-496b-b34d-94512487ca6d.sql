ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new','contacted','qualified','meeting','won','lost')),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_lead_captures_stage ON public.lead_captures (owner_user_id, stage);
CREATE INDEX IF NOT EXISTS idx_lead_captures_next ON public.lead_captures (owner_user_id, next_action_at);

CREATE POLICY "Owners can update their lead captures"
  ON public.lead_captures FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete their lead captures"
  ON public.lead_captures FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);