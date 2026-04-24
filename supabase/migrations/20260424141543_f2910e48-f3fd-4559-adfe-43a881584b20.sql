
-- 1. Fix persona_sections public exposure: only show sections for active, non-private personas
DROP POLICY IF EXISTS "Public can view sections" ON public.persona_sections;

CREATE POLICY "Public can view sections of active public personas"
ON public.persona_sections
FOR SELECT
USING (
  is_visible = true
  AND EXISTS (
    SELECT 1 FROM public.personas p
    WHERE p.id = persona_sections.persona_id
      AND p.is_active = true
      AND p.is_private = false
  )
);

-- Owners can still see all of their own sections (private + invisible)
CREATE POLICY "Owners can view their sections"
ON public.persona_sections
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Remove interaction_logs from realtime publication so other authenticated
-- users cannot subscribe to receive other users' analytics events.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'interaction_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.interaction_logs';
  END IF;
END $$;

-- 3. Harden has_role with explicit NULL guard to defense-in-depth against any
-- code path that might pass NULL user_id.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END;
$$;

-- 4. Add UPDATE and DELETE policies for the private documents bucket so users
-- can manage their own files (GDPR / data privacy right to erasure).
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
