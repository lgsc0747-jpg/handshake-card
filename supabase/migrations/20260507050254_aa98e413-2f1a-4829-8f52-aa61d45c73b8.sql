
CREATE POLICY "Owners can view their orgs"
ON public.organizations FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

DROP FUNCTION IF EXISTS public.whoami();

DELETE FROM public.organizations WHERE name='X' AND owner_user_id='d2641ebd-bb44-4476-9a80-e0cdc4e22c58';
DELETE FROM public.organizations WHERE name='Test' AND owner_user_id='d2641ebd-bb44-4476-9a80-e0cdc4e22c58';
