
-- Personas table: each user can have unlimited identity personas
CREATE TABLE public.personas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  slug text NOT NULL,
  label text NOT NULL DEFAULT 'Default',
  is_active boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  pin_code text,
  require_contact_exchange boolean NOT NULL DEFAULT false,
  display_name text,
  headline text,
  bio text,
  avatar_url text,
  email_public text,
  phone text,
  location text,
  website text,
  linkedin_url text,
  github_url text,
  cv_url text,
  accent_color text DEFAULT '#0d9488',
  background_preset text DEFAULT 'default',
  background_image_url text,
  glass_opacity numeric DEFAULT 0.15,
  availability_status text DEFAULT 'Available',
  work_mode text DEFAULT 'On-site',
  show_availability boolean DEFAULT true,
  show_location boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own personas" ON public.personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own personas" ON public.personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own personas" ON public.personas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own personas" ON public.personas FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public personas are viewable by everyone" ON public.personas FOR SELECT USING (true);

-- Short links table: maps short codes to user IDs (not usernames)
CREATE TABLE public.short_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  persona_id uuid REFERENCES public.personas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short links are readable by everyone" ON public.short_links FOR SELECT USING (true);
CREATE POLICY "Users can create their own short links" ON public.short_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own short links" ON public.short_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own short links" ON public.short_links FOR DELETE USING (auth.uid() = user_id);

-- Lead captures table: stores visitor contact info from Digital Handshakes
CREATE TABLE public.lead_captures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  visitor_name text,
  visitor_email text NOT NULL,
  visitor_phone text,
  visitor_company text,
  visitor_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their lead captures" ON public.lead_captures FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "Anyone can submit a lead capture" ON public.lead_captures FOR INSERT WITH CHECK (true);

-- Add updated_at trigger to personas
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for lead_captures
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_captures;
