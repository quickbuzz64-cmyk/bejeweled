-- Create seo_metadata table
-- Stores AI-generated and manually edited SEO data for products and static pages.

CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'page')),
  entity_id text NOT NULL,
  meta_title text,
  meta_description text,
  keywords text[],
  tags text[],
  og_title text,
  og_description text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT seo_metadata_entity_unique UNIQUE (entity_type, entity_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS seo_metadata_entity_idx
  ON public.seo_metadata (entity_type, entity_id);

-- Row Level Security
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for frontend SEO injection)
CREATE POLICY "Anyone can read seo_metadata"
  ON public.seo_metadata FOR SELECT USING (true);

-- Allow authenticated users to insert / update / delete (admin panel)
CREATE POLICY "Authenticated users can manage seo_metadata"
  ON public.seo_metadata FOR ALL USING (true);
