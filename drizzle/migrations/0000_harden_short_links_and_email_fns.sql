DROP POLICY IF EXISTS "Short links are readable by everyone" ON public.short_links;
CREATE POLICY "Users can read their own short links" ON public.short_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;