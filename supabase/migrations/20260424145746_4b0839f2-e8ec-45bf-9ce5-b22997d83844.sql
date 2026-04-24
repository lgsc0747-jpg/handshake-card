-- These two tables must NEVER be accessed directly by clients.
-- The secure-login edge function uses the service role key (which bypasses RLS)
-- to manage them. Adding explicit deny policies documents this and satisfies
-- the security linter.

CREATE POLICY "Deny all client access to login_attempts"
ON public.login_attempts
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all client access to account_lockouts"
ON public.account_lockouts
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);