-- Migration: Fix RLS policies for the bejeweled-product-images storage bucket
-- The .env.local uses VITE_SUPABASE_PRODUCTS_BUCKET=bejeweled-product-images
-- but the existing schema only added policies for 'bejeweled-images'.
-- Run this migration in the Supabase SQL editor to resolve:
--   StorageApiError: new row violates row-level security policy

-- ─────────────────────────────────────────────────────────────
-- 1. Ensure the bucket exists (public, 10 MB limit, image types)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bejeweled-product-images',
  'bejeweled-product-images',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. RLS policies for bejeweled-product-images
-- ─────────────────────────────────────────────────────────────

-- Public read (needed for getPublicUrl to work)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Public can read bejeweled-product-images'
  ) THEN
    CREATE POLICY "Public can read bejeweled-product-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'bejeweled-product-images');
  END IF;
END $$;

-- Authenticated users can upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Authenticated users can upload bejeweled-product-images'
  ) THEN
    CREATE POLICY "Authenticated users can upload bejeweled-product-images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'bejeweled-product-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Authenticated users can update (upsert / replace)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Authenticated users can update bejeweled-product-images'
  ) THEN
    CREATE POLICY "Authenticated users can update bejeweled-product-images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'bejeweled-product-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Authenticated users can delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Authenticated users can delete bejeweled-product-images'
  ) THEN
    CREATE POLICY "Authenticated users can delete bejeweled-product-images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'bejeweled-product-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
