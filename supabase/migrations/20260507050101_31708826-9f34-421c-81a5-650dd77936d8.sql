
CREATE OR REPLACE FUNCTION public.whoami()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT auth.uid() $$;
