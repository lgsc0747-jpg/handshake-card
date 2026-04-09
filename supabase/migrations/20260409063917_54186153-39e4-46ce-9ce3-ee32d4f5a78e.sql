
-- Create product_images table
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_video boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product images"
  ON public.product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_visible = true
  ));

CREATE POLICY "Users can manage their product images"
  ON public.product_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.user_id = auth.uid()
  ));

-- Create product_variants table
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  price_modifier numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product variants"
  ON public.product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_visible = true
  ));

CREATE POLICY "Users can manage their product variants"
  ON public.product_variants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.user_id = auth.uid()
  ));
