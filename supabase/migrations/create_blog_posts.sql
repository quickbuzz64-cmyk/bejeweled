-- Blog Posts table
-- Stores admin-authored blog posts with SEO metadata and publish status.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  excerpt text,
  meta_title text,
  meta_description text,
  tags text[] DEFAULT '{}',
  featured_image text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for slug lookups (used by public blog detail page)
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);

-- Index for published posts listing
CREATE INDEX IF NOT EXISTS blog_posts_status_created_idx ON public.blog_posts (status, created_at DESC);

-- Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (needed for public blog pages)
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR auth.role() = 'authenticated');

-- Authenticated users (admin) can insert / update / delete
CREATE POLICY "Authenticated users can manage blog posts"
  ON public.blog_posts FOR ALL
  USING (auth.role() = 'authenticated');
