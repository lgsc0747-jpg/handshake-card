-- 1. Add persona link to nfc_cards
ALTER TABLE public.nfc_cards
  ADD COLUMN IF NOT EXISTS persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS nfc_cards_persona_id_idx ON public.nfc_cards(persona_id);

-- 2. Add card link to short_links so each card can have its own short URL
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.nfc_cards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS short_links_card_id_idx ON public.short_links(card_id);

-- 3. Backfill: for any existing card without a persona, link it to the user's
-- currently active persona (best-effort; remains NULL if user has no active persona).
UPDATE public.nfc_cards c
SET persona_id = p.id
FROM public.personas p
WHERE c.persona_id IS NULL
  AND p.user_id = c.user_id
  AND p.is_active = true;