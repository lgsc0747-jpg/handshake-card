CREATE POLICY "Public can read subscription plan"
  ON public.user_subscriptions FOR SELECT
  USING (true);